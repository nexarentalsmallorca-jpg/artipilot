import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceIdForAdmin, requireAdminApiUser } from "@/lib/auth/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DB } from "@/lib/db/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getEnvAccessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || "";
}

function getEnvPhoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || "";
}

function detectWhatsAppType(mime: string, filename: string) {
  const lower = mime.toLowerCase();
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("audio/")) return "audio";
  if (lower.startsWith("video/")) return "video";
  if (lower.includes("pdf") || /\.pdf$/i.test(filename)) return "document";
  return "document";
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if (auth.error) return auth.error;

  const workspaceId = await getWorkspaceIdForAdmin(auth.user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const to = normalizePhone(String(form.get("to") || ""));
  const caption = String(form.get("caption") || "").trim();

  if (!(file instanceof File) || !to) {
    return NextResponse.json({ error: "File and recipient phone are required" }, { status: 400 });
  }

  const accessToken = getEnvAccessToken();
  const phoneNumberId = getEnvPhoneNumberId();
  if (!accessToken || !phoneNumberId) {
    return NextResponse.json({ error: "WhatsApp sender is not configured" }, { status: 500 });
  }

  const bucket = process.env.SUPABASE_WHATSAPP_MEDIA_BUCKET || "artipilot-whatsapp-media";
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  const filename = file.name || "upload.bin";
  const waType = detectWhatsAppType(mime, filename);
  const storagePath = `${workspaceId}/${to}/${Date.now()}-${filename.replace(/[^\w.\-]+/g, "_")}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: mime, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
  const mediaUrl = publicUrlData.publicUrl;

  const uploadForm = new FormData();
  uploadForm.append("file", new Blob([buffer], { type: mime }), filename);
  uploadForm.append("messaging_product", "whatsapp");
  uploadForm.append("type", waType);

  const mediaUploadRes = await fetch(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: uploadForm,
    }
  );

  const mediaUploadData = (await mediaUploadRes.json()) as { id?: string; error?: { message?: string } };
  const mediaId = mediaUploadData.id;

  if (!mediaUploadRes.ok || !mediaId) {
    return NextResponse.json(
      { error: mediaUploadData.error?.message || "WhatsApp media upload failed" },
      { status: 502 }
    );
  }

  const messageBody: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: waType,
  };

  if (waType === "image") {
    messageBody.image = { id: mediaId, caption: caption || undefined };
  } else if (waType === "audio") {
    messageBody.audio = { id: mediaId };
  } else if (waType === "video") {
    messageBody.video = { id: mediaId, caption: caption || undefined };
  } else {
    messageBody.document = { id: mediaId, filename, caption: caption || undefined };
  }

  const sendRes = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messageBody),
  });

  const sendData = (await sendRes.json()) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };

  if (!sendRes.ok) {
    return NextResponse.json(
      { error: sendData.error?.message || "Failed to send media message" },
      { status: 502 }
    );
  }

  const now = new Date().toISOString();
  const whatsappMessageId = sendData.messages?.[0]?.id || null;

  const { data: savedMessage, error: saveError } = await supabaseAdmin
    .from(DB.messages)
    .insert({
      workspace_id: workspaceId,
      owner_user_id: auth.user.id,
      contact_phone: to,
      whatsapp_message_id: whatsappMessageId,
      role: "manual",
      direction: "outbound",
      message_type: waType,
      content: caption || `[${waType}]`,
      created_at: now,
      delivery_status: whatsappMessageId ? "sent" : "failed",
      media_id: mediaId,
      media_url: mediaUrl,
      media_mime_type: mime,
      media_filename: filename,
      media_size: buffer.length,
      media_storage_path: storagePath,
      raw_payload: sendData,
    })
    .select("*")
    .maybeSingle();

  if (saveError) {
    console.error("Media message save error:", saveError.message);
  }

  return NextResponse.json({
    ok: true,
    message: savedMessage,
    media_url: mediaUrl,
    whatsapp_message_id: whatsappMessageId,
  });
}
