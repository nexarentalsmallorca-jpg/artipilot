import {
  handleWhatsAppWebhookGet,
  handleWhatsAppWebhookPost,
} from "@/lib/whatsapp/webhookHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleWhatsAppWebhookGet;
export const POST = handleWhatsAppWebhookPost;
