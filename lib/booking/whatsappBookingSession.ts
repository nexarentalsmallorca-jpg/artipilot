import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type BookingSessionStage =
  | "licence_check"
  | "plan_selection"
  | "collect_date"
  | "collect_time"
  | "check_availability"
  | "collect_customer_details"
  | "create_payment"
  | "waiting_payment"
  | "confirmed"
  | "needs_human";

export type BookingSessionStatus =
  | "active"
  | "waiting_payment"
  | "confirmed"
  | "cancelled"
  | "needs_human";

export type VehicleType = "scooter" | "ebike" | null;

export type LicenceStatus =
  | "unknown"
  | "eligible"
  | "not_eligible"
  | "needs_team_review"
  | null;

export type BookingPlan =
  | "half_day"
  | "full_day"
  | "multi_day"
  | "ebike_hourly"
  | "ebike_day"
  | null;

export type BookingSession = {
  id: string;

  contact_id: string;
  phone: string | null;
  customer_name: string | null;
  customer_email: string | null;

  status: BookingSessionStatus;
  stage: BookingSessionStage;

  vehicle_type: VehicleType;
  quantity: number | null;

  licence_status: LicenceStatus;
  licence_notes: string | null;

  plan: BookingPlan;
  pickup_date: string | null;
  pickup_time: string | null;
  return_date: string | null;
  return_time: string | null;

  total_amount: number | null;
  payment_amount: number | null;
  remaining_amount: number | null;
  deposit_amount: number | null;

  website_booking_id: string | null;
  stripe_checkout_url: string | null;
  stripe_session_id: string | null;
  payment_status: string | null;

  needs_human_attention: boolean;
  human_reason: string | null;

  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
};

export type BookingSessionPatch = Partial<
  Omit<BookingSession, "id" | "created_at" | "updated_at">
>;

const TABLE_NAME = "artipilot_booking_sessions";

function db() {
  return getSupabaseAdmin();
}

function normalizeSession(row: any): BookingSession {
  return {
    id: row.id,

    contact_id: row.contact_id,
    phone: row.phone ?? null,
    customer_name: row.customer_name ?? null,
    customer_email: row.customer_email ?? null,

    status: row.status ?? "active",
    stage: row.stage ?? "licence_check",

    vehicle_type: row.vehicle_type ?? null,
    quantity: typeof row.quantity === "number" ? row.quantity : 1,

    licence_status: row.licence_status ?? "unknown",
    licence_notes: row.licence_notes ?? null,

    plan: row.plan ?? null,
    pickup_date: row.pickup_date ?? null,
    pickup_time: row.pickup_time ?? null,
    return_date: row.return_date ?? null,
    return_time: row.return_time ?? null,

    total_amount:
      row.total_amount === null || row.total_amount === undefined
        ? null
        : Number(row.total_amount),
    payment_amount:
      row.payment_amount === null || row.payment_amount === undefined
        ? null
        : Number(row.payment_amount),
    remaining_amount:
      row.remaining_amount === null || row.remaining_amount === undefined
        ? null
        : Number(row.remaining_amount),
    deposit_amount:
      row.deposit_amount === null || row.deposit_amount === undefined
        ? 150
        : Number(row.deposit_amount),

    website_booking_id: row.website_booking_id ?? null,
    stripe_checkout_url: row.stripe_checkout_url ?? null,
    stripe_session_id: row.stripe_session_id ?? null,
    payment_status: row.payment_status ?? null,

    needs_human_attention: Boolean(row.needs_human_attention),
    human_reason: row.human_reason ?? null,

    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata
        : {},

    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function cleanPatch(patch: BookingSessionPatch) {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export async function getActiveBookingSessionByContactId(
  contactId: string
): Promise<BookingSession | null> {
  if (!contactId) return null;

  const { data, error } = await db()
    .from(TABLE_NAME)
    .select("*")
    .eq("contact_id", contactId)
    .in("status", ["active", "waiting_payment", "needs_human"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[whatsappBookingSession] getActiveBookingSessionByContactId error:",
      error
    );
    return null;
  }

  return data ? normalizeSession(data) : null;
}

export async function getBookingSessionById(
  sessionId: string
): Promise<BookingSession | null> {
  if (!sessionId) return null;

  const { data, error } = await db()
    .from(TABLE_NAME)
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("[whatsappBookingSession] getBookingSessionById error:", error);
    return null;
  }

  return data ? normalizeSession(data) : null;
}

export async function createBookingSession(input: {
  contactId: string;
  phone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<BookingSession | null> {
  if (!input.contactId) {
    console.error("[whatsappBookingSession] createBookingSession missing contactId");
    return null;
  }

  const { data, error } = await db()
    .from(TABLE_NAME)
    .insert({
      contact_id: input.contactId,
      phone: input.phone ?? null,
      customer_name: input.customerName ?? null,
      customer_email: input.customerEmail ?? null,
      status: "active",
      stage: "licence_check",
      quantity: 1,
      licence_status: "unknown",
      deposit_amount: 150,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("[whatsappBookingSession] createBookingSession error:", error);
    return null;
  }

  return normalizeSession(data);
}

export async function getOrCreateBookingSession(input: {
  contactId: string;
  phone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<BookingSession | null> {
  const existing = await getActiveBookingSessionByContactId(input.contactId);

  if (existing) {
    const patch: BookingSessionPatch = {};

    if (!existing.phone && input.phone) {
      patch.phone = input.phone;
    }

    if (!existing.customer_name && input.customerName) {
      patch.customer_name = input.customerName;
    }

    if (!existing.customer_email && input.customerEmail) {
      patch.customer_email = input.customerEmail;
    }

    if (Object.keys(patch).length > 0) {
      return updateBookingSession(existing.id, patch);
    }

    return existing;
  }

  return createBookingSession(input);
}

export async function updateBookingSession(
  sessionId: string,
  patch: BookingSessionPatch
): Promise<BookingSession | null> {
  if (!sessionId) return null;

  const cleaned = cleanPatch(patch);

  if (Object.keys(cleaned).length === 0) {
    return getBookingSessionById(sessionId);
  }

  const { data, error } = await db()
    .from(TABLE_NAME)
    .update(cleaned)
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) {
    console.error("[whatsappBookingSession] updateBookingSession error:", error);
    return null;
  }

  return normalizeSession(data);
}

export async function updateBookingSessionStage(
  sessionId: string,
  stage: BookingSessionStage
): Promise<BookingSession | null> {
  const patch: BookingSessionPatch = { stage };

  if (stage === "waiting_payment") {
    patch.status = "waiting_payment";
  }

  if (stage === "confirmed") {
    patch.status = "confirmed";
  }

  if (stage === "needs_human") {
    patch.status = "needs_human";
    patch.needs_human_attention = true;
  }

  return updateBookingSession(sessionId, patch);
}

export async function markBookingSessionNeedsHuman(
  sessionId: string,
  reason: string
): Promise<BookingSession | null> {
  return updateBookingSession(sessionId, {
    status: "needs_human",
    stage: "needs_human",
    needs_human_attention: true,
    human_reason: reason,
  });
}

export async function markBookingSessionConfirmed(input: {
  sessionId: string;
  websiteBookingId?: string | null;
  stripeSessionId?: string | null;
}): Promise<BookingSession | null> {
  return updateBookingSession(input.sessionId, {
    status: "confirmed",
    stage: "confirmed",
    payment_status: "paid",
    website_booking_id: input.websiteBookingId ?? undefined,
    stripe_session_id: input.stripeSessionId ?? undefined,
  });
}

export async function cancelBookingSession(
  sessionId: string,
  reason?: string
): Promise<BookingSession | null> {
  return updateBookingSession(sessionId, {
    status: "cancelled",
    metadata: {
      cancelled_reason: reason ?? null,
      cancelled_at: new Date().toISOString(),
    },
  });
}

export async function mergeBookingSessionMetadata(
  sessionId: string,
  metadataPatch: Record<string, unknown>
): Promise<BookingSession | null> {
  const current = await getBookingSessionById(sessionId);

  if (!current) return null;

  return updateBookingSession(sessionId, {
    metadata: {
      ...(current.metadata ?? {}),
      ...metadataPatch,
    },
  });
}

export function isBookingSessionFinished(session: BookingSession | null): boolean {
  if (!session) return false;

  return ["confirmed", "cancelled"].includes(session.status);
}

export function shouldCreateNewBookingSession(session: BookingSession | null): boolean {
  if (!session) return true;

  return ["confirmed", "cancelled"].includes(session.status);
}

export function getBookingSessionSummary(session: BookingSession | null): string {
  if (!session) return "No active booking session.";

  const parts = [
    `Status: ${session.status}`,
    `Stage: ${session.stage}`,
    session.vehicle_type ? `Vehicle: ${session.vehicle_type}` : null,
    session.quantity ? `Quantity: ${session.quantity}` : null,
    session.licence_status ? `Licence: ${session.licence_status}` : null,
    session.plan ? `Plan: ${session.plan}` : null,
    session.pickup_date ? `Pickup date: ${session.pickup_date}` : null,
    session.pickup_time ? `Pickup time: ${session.pickup_time}` : null,
    session.return_date ? `Return date: ${session.return_date}` : null,
    session.return_time ? `Return time: ${session.return_time}` : null,
    session.customer_name ? `Customer name: ${session.customer_name}` : null,
    session.customer_email ? `Customer email: ${session.customer_email}` : null,
    session.total_amount !== null ? `Total: €${session.total_amount}` : null,
    session.payment_amount !== null ? `Online payment: €${session.payment_amount}` : null,
    session.remaining_amount !== null
      ? `Remaining at pickup: €${session.remaining_amount}`
      : null,
    session.deposit_amount !== null ? `Deposit: €${session.deposit_amount}` : null,
    session.needs_human_attention
      ? `Needs human: ${session.human_reason ?? "yes"}`
      : null,
  ].filter(Boolean);

  return parts.join("\n");
}