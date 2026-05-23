import { NextRequest } from "next/server";
import {
  handleWhatsAppWebhookGet,
  handleWhatsAppWebhookPost,
} from "@/lib/whatsapp/webhookHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleWhatsAppWebhookGet(request);
}

export async function POST(request: NextRequest) {
  return handleWhatsAppWebhookPost(request);
}
