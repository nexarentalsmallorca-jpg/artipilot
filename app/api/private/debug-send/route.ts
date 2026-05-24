import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/private-session";
import { sendWhatsAppText } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: string | null) {
  return String(value || "").trim();
}

export async function GET(request: NextRequest) {
  const denied = await requirePrivateSession(request);

  if (denied) {
    return denied;
  }

  const phone = clean(request.nextUrl.searchParams.get("phone"));
  const text =
    clean(request.nextUrl.searchParams.get("text")) ||
    "Test message from NEXA Rentals dashboard";

  if (!phone) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing phone query parameter.",
        example:
          "/api/private/debug-send?phone=34612566850&text=hello",
      },
      { status: 400 }
    );
  }

  const envCheck = {
    hasWhatsAppAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    hasWhatsAppPhoneNumberId: Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
    ),
    apiVersion: process.env.WHATSAPP_API_VERSION || "v20.0",
    phoneNumberIdPreview:
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()?.slice(0, 6) || null,
  };

  try {
    const result = await sendWhatsAppText(phone, text);

    return NextResponse.json({
      ok: result.ok,
      error: result.ok ? null : result.error,
      messageId: result.ok ? result.messageId : null,
      raw: result.raw || null,
      envCheck,
      testedPhone: phone,
      testedText: text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        envCheck,
        testedPhone: phone,
        testedText: text,
      },
      { status: 500 }
    );
  }
}