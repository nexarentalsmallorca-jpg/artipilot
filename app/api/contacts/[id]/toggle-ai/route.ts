import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { setContactAiEnabled } from "@/lib/db/contacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const { id } = await context.params;
  const body = (await request.json()) as { enabled?: boolean };

  const enabled =
    typeof body.enabled === "boolean"
      ? body.enabled
      : undefined;

  if (enabled === undefined) {
    const contact = await import("@/lib/db/contacts").then((m) =>
      m.getContactById(id)
    );
    if (!contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await setContactAiEnabled(id, !contact.ai_enabled);
    return NextResponse.json({ contact: updated });
  }

  const updated = await setContactAiEnabled(id, enabled);
  return NextResponse.json({ contact: updated });
}
