import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";
import { updateContactFields } from "@/lib/db/contacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  const { id } = await context.params;
  const body = await request.json();

  const contact = await updateContactFields(id, {
    notes: body.notes !== undefined ? String(body.notes) : undefined,
    archived: body.archived !== undefined ? Boolean(body.archived) : undefined,
    name: body.name !== undefined ? String(body.name) : undefined,
  });

  return NextResponse.json({ contact });
}
