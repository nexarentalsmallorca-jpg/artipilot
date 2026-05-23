import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { upsertContactFromWhatsApp } from "@/lib/db/contacts";
import { insertMessage } from "@/lib/db/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const contact = await upsertContactFromWhatsApp({
    whatsappId: "dev_test_wa",
    phone: "34600000000",
    profileName: "Test Customer",
  });

  await insertMessage({
    contact_id: contact.id,
    direction: "inbound",
    sender_type: "customer",
    body: "Hi, do you have scooters available tomorrow?",
    status: "received",
  });

  return NextResponse.json({ contact });
}
