import { NextRequest, NextResponse } from "next/server";
import { requireInboxApiAccess } from "@/lib/inbox/inboxRouteAuth";
import {
  ArtipilotChatMessage,
  generateArtipilotReply,
} from "@/lib/artipilotAi";
import { loadActiveTrainingContext } from "@/lib/ai/trainingContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
  business_name: string | null;
  business_type: string | null;
  main_language: string | null;
  ai_job: string | null;
  business_rules: string | null;
};

type ContactRow = {
  id: string;
  phone: string;
  name: string | null;
  last_message: string | null;
  ai_enabled: boolean | null;
  needs_human_attention?: boolean | null;
  human_attention_reason?: string | null;
  customer_notes?: string | null;
};

type MessageRow = {
  role: "customer" | "assistant" | "manual" | "system";
  direction: "inbound" | "outbound";
  content: string | null;
  created_at: string;
  message_type?: string | null;
  media_filename?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  link_url?: string | null;
};

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("AI suggestion auth error:", error);
    return null;
  }

  return user;
}

async function getWorkspaceForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select(
      "id, owner_user_id, business_name, business_type, main_language, ai_job, business_rules"
    )
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("AI suggestion workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function hasColumnError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error as { hint?: string })?.hint ||
      ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist")
  );
}

async function getContact({
  workspace,
  userId,
  phone,
}: {
  workspace: WorkspaceRow;
  userId: string;
  phone: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .select(
      "id, phone, name, last_message, ai_enabled, needs_human_attention, human_attention_reason, customer_notes"
    )
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .maybeSingle();

  if (!error) {
    return (data as ContactRow | null) || null;
  }

  if (!hasColumnError(error)) {
    console.error("AI suggestion contact error:", error);
    return null;
  }

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("id, phone, name, last_message, ai_enabled")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .maybeSingle();

  if (fallbackError) {
    console.error("AI suggestion contact fallback error:", fallbackError);
    return null;
  }

  return (fallbackData as ContactRow | null) || null;
}

function enrichMessageContent(message: MessageRow) {
  const type = message.message_type || "text";
  const content = String(message.content || "").trim();

  if (type === "image") {
    return content && content !== "[Image received]"
      ? content
      : "Customer sent an image.";
  }

  if (type === "video") {
    return content && content !== "[Video received]"
      ? content
      : "Customer sent a video.";
  }

  if (type === "audio") {
    return "Customer sent an audio or voice message.";
  }

  if (type === "document") {
    return `Customer sent a document${
      message.media_filename ? ` named ${message.media_filename}` : ""
    }. ${content || ""}`.trim();
  }

  if (type === "location") {
    return `Customer shared a location${
      message.location_name ? `: ${message.location_name}` : ""
    }${
      message.location_address ? `, ${message.location_address}` : ""
    }.`;
  }

  if (message.link_url) {
    return `${content}\nCustomer also sent this link: ${message.link_url}`.trim();
  }

  return content;
}

async function getRecentMessages({
  workspace,
  userId,
  phone,
}: {
  workspace: WorkspaceRow;
  userId: string;
  phone: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_messages")
    .select(
      "role, direction, content, created_at, message_type, media_filename, location_name, location_address, link_url"
    )
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("contact_phone", phone)
    .order("created_at", { ascending: false })
    .limit(18);

  if (!error) {
    return ((data || []) as MessageRow[])
      .reverse()
      .map((message) => ({
        role: message.role,
        direction: message.direction,
        content: enrichMessageContent(message),
        created_at: message.created_at,
      })) as ArtipilotChatMessage[];
  }

  if (!hasColumnError(error)) {
    console.error("AI suggestion recent messages error:", error);
    return [];
  }

  console.warn("AI suggestion recent messages fallback used:", error.message);

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("artipilot_messages")
    .select("role, direction, content, created_at")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("contact_phone", phone)
    .order("created_at", { ascending: false })
    .limit(18);

  if (fallbackError) {
    console.error("AI suggestion recent messages fallback error:", fallbackError);
    return [];
  }

  return ((fallbackData || []).reverse() as ArtipilotChatMessage[]) || [];
}

function cleanSuggestion(text: string) {
  return String(text || "")
    .replace(/^nero:\s*/i, "")
    .replace(/^assistant:\s*/i, "")
    .replace(/^ai:\s*/i, "")
    .trim();
}

function buildHumanContext(contact: ContactRow) {
  const parts: string[] = [];

  if (contact.needs_human_attention) {
    parts.push("This customer may need human attention.");
  }

  if (contact.human_attention_reason) {
    parts.push(`Human attention reason: ${contact.human_attention_reason}`);
  }

  if (contact.customer_notes) {
    parts.push(`Internal customer notes: ${contact.customer_notes}`);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInboxApiAccess(request);
    if (!auth.ok) return auth.response;

    const { userId, workspace: workspaceRow } = auth.ctx;

    const { data: workspace } = await supabaseAdmin
      .from("artipilot_workspaces")
      .select("*")
      .eq("id", workspaceRow.id)
      .maybeSingle();

    if (!workspace?.id) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const phone = normalizePhone(String(body?.phone || ""));
    const latestMessageFromBody = String(body?.latestMessage || "").trim();

    if (!phone) {
      return NextResponse.json(
        {
          error: "Missing contact phone",
        },
        { status: 400 }
      );
    }

    const contact = await getContact({
      workspace,
      userId,
      phone,
    });

    if (!contact?.id) {
      return NextResponse.json(
        {
          error: "Contact not found",
        },
        { status: 404 }
      );
    }

    const recentMessages = await getRecentMessages({
      workspace,
      userId,
      phone,
    });

    const latestCustomerMessage =
      latestMessageFromBody ||
      [...recentMessages]
        .reverse()
        .find((message) => message.role === "customer")?.content ||
      contact.last_message ||
      "Customer is waiting for a reply.";

    const humanContext = buildHumanContext(contact);
    const trainingKnowledge = await loadActiveTrainingContext(workspace.id);

    const suggestion = await generateArtipilotReply({
      businessName: workspace.business_name || "NEXA Rentals",
      businessType:
        workspace.business_type ||
        "125cc scooter rental business in Magaluf, Mallorca",
      mainLanguage: workspace.main_language || "English",
      aiJob:
        workspace.ai_job ||
        "Answer customer questions, collect useful booking details, explain rental rules, and pass important requests to the team.",
      businessRules:
        [
          workspace.business_rules ||
            "Be short, friendly and professional. Never confirm final availability, final price, or important decisions unless the business has clearly provided that information. If unsure, say the team will confirm shortly.",
          "This is an internal AI suggestion for the business owner to review before sending.",
          "Write only the reply text. Do not add labels like 'Nero:' or 'Assistant:'.",
          "If the customer sent media, location, document, or link, acknowledge it naturally and ask for the missing detail if needed.",
          humanContext,
        ]
          .filter(Boolean)
          .join("\n\n"),
      trainingKnowledge,
      customerName: contact.name,
      customerPhone: phone,
      customerMessage: latestCustomerMessage,
      recentMessages,
    });

    return NextResponse.json(
      {
        success: true,
        suggestion: cleanSuggestion(suggestion),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("AI suggestion API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI suggestion generation failed",
      },
      { status: 500 }
    );
  }
}