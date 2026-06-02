import {
  calculateEbikePrice,
  calculateScooterPrice,
  evaluateLicenceFromText,
  getEbikePriceMessage,
  getEmergencyHandoffMessage,
  getLicenceQuestion,
  getNeroSeason,
  getNormalHumanHandoffMessage,
  getOwnerPrivacyMessage,
  getScooterPriceMessage,
  NEXA_LOCATION_URL,
  shouldGiveEmergencyPhone,
  validateFullDayTimes,
  validateHalfDayTimes,
  type NeroScooterPlan,
} from "@/lib/booking/nexaBookingRules";

import {
  getActiveBookingSessionByContactId,
  getOrCreateBookingSession,
  getBookingSessionSummary,
  markBookingSessionNeedsHuman,
  updateBookingSession,
  type BookingSession,
  type BookingSessionStage,
} from "@/lib/booking/whatsappBookingSession";

export type NeroIncomingMessage = {
  contactId: string;
  phone?: string | null;
  customerName?: string | null;
  text?: string | null;
  language?: string | null;
  hasMedia?: boolean;
  mediaType?: "image" | "document" | "video" | "audio" | "unknown" | null;
};

export type NeroOrchestratorResult = {
  handled: boolean;
  reply: string | null;
  session: BookingSession | null;
  shouldContinueToAi: boolean;
  needsHumanAttention: boolean;
  debugReason: string;
};

type DetectedIntent =
  | "booking"
  | "price"
  | "location"
  | "human"
  | "owner"
  | "emergency"
  | "licence"
  | "media"
  | "payment"
  | "unknown";

type DetectedPlan = {
  plan: "half_day" | "full_day" | "multi_day" | "ebike_hourly" | "ebike_day" | null;
  days: number | null;
  hours: 1 | 2 | 3 | 4 | null;
};

function normalizeText(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function detectIntent(message: NeroIncomingMessage): DetectedIntent {
  const text = normalizeText(message.text);

  if (message.hasMedia) return "media";

  if (!text) return "unknown";

  if (
    hasAny(text, [
      "accident",
      "emergency",
      "urgent",
      "injury",
      "hurt",
      "police",
      "not working",
      "stopped working",
      "broken down",
      "breakdown",
      "flat tyre",
      "flat tire",
      "puncture",
      "pinchazo",
      "accidente",
      "urgence",
      "panne",
      "moto no arranca",
      "scooter stopped",
      "scooter won't start",
      "scooter wont start",
    ])
  ) {
    return "emergency";
  }

  if (
    hasAny(text, [
      "owner",
      "boss",
      "manager name",
      "who owns",
      "who is the owner",
      "propietario",
      "dueño",
      "dueno",
      "patron",
    ])
  ) {
    return "owner";
  }

  if (
    hasAny(text, [
      "human",
      "person",
      "team",
      "staff",
      "agent",
      "real person",
      "talk to someone",
      "speak to someone",
      "hablar con alguien",
      "persona",
      "equipo",
      "humain",
      "quelqu'un",
    ])
  ) {
    return "human";
  }

  if (
    hasAny(text, [
      "where",
      "location",
      "address",
      "maps",
      "map",
      "ubicacion",
      "ubicación",
      "direccion",
      "dirección",
      "adresse",
      "ou etes vous",
      "où êtes-vous",
      "dove siete",
    ])
  ) {
    return "location";
  }

  if (
    hasAny(text, [
      "price",
      "prices",
      "cost",
      "how much",
      "rate",
      "rates",
      "precio",
      "precios",
      "cuanto",
      "cuánto",
      "tarif",
      "prix",
      "quanto costa",
      "costo",
    ])
  ) {
    return "price";
  }

  if (
    hasAny(text, [
      "pay",
      "payment",
      "paid",
      "stripe",
      "checkout",
      "payment link",
      "deposit",
      "pagar",
      "pago",
      "payer",
      "paiement",
    ])
  ) {
    return "payment";
  }

  if (
    hasAny(text, [
      "licence",
      "license",
      "driving licence",
      "driving license",
      "a1",
      "a2",
      "a licence",
      "a license",
      "car licence",
      "car license",
      "permiso",
      "carnet",
      "patente",
      "provisional",
      "learner",
      "international driving permit",
      "idp",
    ])
  ) {
    return "licence";
  }

  if (
    hasAny(text, [
      "book",
      "booking",
      "reserve",
      "reservation",
      "rent",
      "rental",
      "hire",
      "scooter",
      "motorbike",
      "moto",
      "vespa",
      "piaggio",
      "125cc",
      "125 cc",
      "e-bike",
      "ebike",
      "electric bike",
      "bike",
      "bicycle",
      "bici",
      "bicicleta",
      "alquilar",
      "reservar",
      "réserver",
      "louer",
      "noleggiare",
      "prenotare",
    ])
  ) {
    return "booking";
  }

  return "unknown";
}

function shouldCreateOrContinueSession(
  intent: DetectedIntent,
  activeSession: BookingSession | null
) {
  if (activeSession) return true;
  return intent !== "unknown";
}

function detectVehicleType(
  textInput: string | null | undefined
): "scooter" | "ebike" | null {
  const text = normalizeText(textInput);

  if (
    hasAny(text, [
      "e-bike",
      "ebike",
      "electric bike",
      "bicycle",
      "bici",
      "bicicleta",
      "velo",
      "vélo",
    ])
  ) {
    return "ebike";
  }

  if (
    hasAny(text, [
      "scooter",
      "moto",
      "motorbike",
      "125",
      "125cc",
      "125 cc",
      "vespa",
      "piaggio",
    ])
  ) {
    return "scooter";
  }

  if (/\bbike\b/.test(text)) {
    return "ebike";
  }

  return null;
}

function detectQuantity(textInput: string | null | undefined): number | null {
  const text = normalizeText(textInput);

  const digitMatch = text.match(/\b([1-9]|1[0-9]|20)\b/);
  if (digitMatch) return Number(digitMatch[1]);

  const words: Record<string, number> = {
    one: 1,
    uno: 1,
    una: 1,
    un: 1,
    two: 2,
    dos: 2,
    deux: 2,
    three: 3,
    tres: 3,
    trois: 3,
    four: 4,
    cuatro: 4,
    quatre: 4,
    five: 5,
    cinco: 5,
    cinq: 5,
    six: 6,
    seis: 6,
    sixx: 6,
    seven: 7,
    siete: 7,
    sept: 7,
    eight: 8,
    ocho: 8,
    huit: 8,
    nine: 9,
    nueve: 9,
    neuf: 9,
    ten: 10,
    diez: 10,
    dix: 10,
  };

  for (const [word, qty] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return qty;
  }

  return null;
}

function detectPlan(textInput: string | null | undefined): DetectedPlan {
  const text = normalizeText(textInput);

  const hourMatch = text.match(
    /\b([1-4])\s*(h|hour|hours|hora|horas|heure|heures)\b/
  );

  if (hourMatch) {
    return {
      plan: "ebike_hourly",
      days: null,
      hours: Number(hourMatch[1]) as 1 | 2 | 3 | 4,
    };
  }

  if (
    hasAny(text, [
      "half day",
      "half-day",
      "medio dia",
      "medio día",
      "demi journee",
      "demi-journée",
      "mezza giornata",
    ])
  ) {
    return {
      plan: "half_day",
      days: null,
      hours: null,
    };
  }

  const dayMatch = text.match(
    /\b([1-6])\s*(day|days|dia|dias|día|días|jour|jours|giorno|giorni)\b/
  );

  if (dayMatch) {
    const days = Number(dayMatch[1]);

    return {
      plan: days === 1 ? "full_day" : "multi_day",
      days,
      hours: null,
    };
  }

  if (
    hasAny(text, [
      "full day",
      "24h",
      "24 h",
      "one day",
      "1 day",
      "todo el dia",
      "todo el día",
      "journee complete",
      "journée complète",
      "giornata intera",
      "whole day",
      "all day",
      "daily",
    ])
  ) {
    return {
      plan: "full_day",
      days: 1,
      hours: null,
    };
  }

  return {
    plan: null,
    days: null,
    hours: null,
  };
}

function normalizePlanForVehicle(
  vehicleType: "scooter" | "ebike",
  planInfo: DetectedPlan
): DetectedPlan {
  if (vehicleType !== "ebike") {
    return planInfo;
  }

  if (planInfo.plan === "full_day") {
    return {
      ...planInfo,
      plan: "ebike_day",
      days: 1,
      hours: null,
    };
  }

  return planInfo;
}

function detectDateText(textInput: string | null | undefined): string | null {
  const text = String(textInput || "").trim();

  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const slashMatch = text.match(
    /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}|\d{2}))?\b/
  );

  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const rawYear = slashMatch[3];

    const year = rawYear
      ? rawYear.length === 2
        ? `20${rawYear}`
        : rawYear
      : String(new Date().getFullYear());

    return `${year}-${month}-${day}`;
  }

  return null;
}

function detectTimeText(textInput: string | null | undefined): string | null {
  const text = normalizeText(textInput);

  const colonMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colonMatch) {
    return `${colonMatch[1].padStart(2, "0")}:${colonMatch[2]}`;
  }

  const hourMatch = text.match(/\b([1-9]|1[0-9]|2[0-3])\s*(am|pm|h)?\b/);
  if (!hourMatch) return null;

  let hour = Number(hourMatch[1]);
  const suffix = hourMatch[2];

  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;

  if (suffix === "h" || suffix === "am" || suffix === "pm") {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  return null;
}

function detectEmail(textInput: string | null | undefined): string | null {
  const match = String(textInput || "").match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0] : null;
}

function detectCustomerName(textInput: string | null | undefined): string | null {
  const text = String(textInput || "").trim();

  const patterns = [
    /\bmy name is\s+([a-zA-ZÀ-ÿ' -]{2,60})/i,
    /\bi am\s+([a-zA-ZÀ-ÿ' -]{2,60})/i,
    /\bi'm\s+([a-zA-ZÀ-ÿ' -]{2,60})/i,
    /\bme llamo\s+([a-zA-ZÀ-ÿ' -]{2,60})/i,
    /\bje m'appelle\s+([a-zA-ZÀ-ÿ' -]{2,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function makeIntroIfNeeded(session: BookingSession): string {
  const alreadyIntroduced = Boolean(session.metadata?.nero_introduced);

  if (alreadyIntroduced) return "";

  return "Hi, I’m Nero, the AI assistant created by NEXA Rentals 😊\n\n";
}

function getLanguageCode(message: NeroIncomingMessage): string {
  return message.language || "en";
}

function mergeMetadata(
  session: BookingSession,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(session.metadata || {}),
    ...patch,
  };
}

function makePriceOptionsReply(input: {
  vehicleType: "scooter" | "ebike";
  pickupDate?: string | null;
}) {
  if (input.vehicleType === "ebike") {
    return `${getEbikePriceMessage()}\n\nWhich option would you like?`;
  }

  return `${getScooterPriceMessage(
    input.pickupDate
  )}\n\nWhich option would you like: Half Day, 1 day, or multiple days?`;
}

function getNextQuestionForStage(
  stage: BookingSessionStage,
  language?: string | null
): string {
  if (stage === "licence_check") {
    return getLicenceQuestion(language);
  }

  if (stage === "plan_selection") {
    return "Which plan would you like: Half Day, 1 day / 24 hours, or multiple days?";
  }

  if (stage === "collect_date") {
    return "What pickup date would you like?";
  }

  if (stage === "collect_time") {
    return "What pickup time would you prefer?";
  }

  if (stage === "collect_customer_details") {
    return "Please send your full name and email so I can prepare the booking.";
  }

  if (stage === "waiting_payment") {
    return "Your payment link is being prepared. Once payment is completed, your booking can be confirmed.";
  }

  if (stage === "needs_human") {
    return getNormalHumanHandoffMessage();
  }

  return "I’ll help you with that. Could you send the missing booking details?";
}

async function getSessionForIntent(
  message: NeroIncomingMessage,
  intent: DetectedIntent
): Promise<{
  session: BookingSession | null;
  shouldContinueToAi: boolean;
  debugReason: string;
}> {
  const activeSession = await getActiveBookingSessionByContactId(
    message.contactId
  );

  if (!shouldCreateOrContinueSession(intent, activeSession)) {
    return {
      session: null,
      shouldContinueToAi: true,
      debugReason: "unknown intent and no active booking session",
    };
  }

  if (activeSession) {
    return {
      session: activeSession,
      shouldContinueToAi: false,
      debugReason: "active booking session found",
    };
  }

  const session = await getOrCreateBookingSession({
    contactId: message.contactId,
    phone: message.phone,
    customerName: message.customerName,
    metadata: {
      source: "whatsapp",
      nero_introduced: false,
    },
  });

  if (!session) {
    return {
      session: null,
      shouldContinueToAi: true,
      debugReason: "could not create booking session",
    };
  }

  return {
    session,
    shouldContinueToAi: false,
    debugReason: `created session for ${intent} intent`,
  };
}

async function updateSessionFromMessage(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<BookingSession> {
  const text = message.text || "";
  const patch: Record<string, unknown> = {};
  let metadataPatch: Record<string, unknown> = {};

  const vehicleType = detectVehicleType(text);
  const finalVehicleType = vehicleType || session.vehicle_type || null;

  if (vehicleType && !session.vehicle_type) {
    patch.vehicle_type = vehicleType;
  }

  const quantity = detectQuantity(text);
  if (quantity && (!session.quantity || session.quantity === 1)) {
    patch.quantity = quantity;
  }

  const rawPlanInfo = detectPlan(text);
  const planInfo = finalVehicleType
    ? normalizePlanForVehicle(finalVehicleType, rawPlanInfo)
    : rawPlanInfo;

  if (planInfo.plan && !session.plan) {
    patch.plan = planInfo.plan;
  }

  if (planInfo.days) {
    metadataPatch = {
      ...metadataPatch,
      requested_days: planInfo.days,
    };
  }

  if (planInfo.hours) {
    metadataPatch = {
      ...metadataPatch,
      requested_hours: planInfo.hours,
    };
  }

  const pickupDate = detectDateText(text);
  if (pickupDate && !session.pickup_date) {
    patch.pickup_date = pickupDate;
  }

  const pickupTime = detectTimeText(text);
  if (pickupTime && !session.pickup_time) {
    patch.pickup_time = pickupTime;
  }

  const email = detectEmail(text);
  if (email && !session.customer_email) {
    patch.customer_email = email;
  }

  const customerName = detectCustomerName(text) || message.customerName;
  if (customerName && !session.customer_name) {
    patch.customer_name = customerName;
  }

  if (Object.keys(metadataPatch).length > 0) {
    patch.metadata = mergeMetadata(session, metadataPatch);
  }

  if (Object.keys(patch).length === 0) return session;

  const updated = await updateBookingSession(session.id, patch);
  return updated || session;
}

async function moveEbikeSessionToPlanSelection(
  session: BookingSession
): Promise<BookingSession> {
  const updated = await updateBookingSession(session.id, {
    vehicle_type: "ebike",
    licence_status: "eligible",
    licence_notes: "E-bike flow does not require 125cc scooter licence check.",
    stage: "plan_selection",
    metadata: mergeMetadata(session, {
      nero_introduced: true,
    }),
  });

  return updated || session;
}

async function handleLicenceStage(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const intro = makeIntroIfNeeded(session);
  const language = getLanguageCode(message);
  const text = message.text || "";
  const vehicleType = session.vehicle_type || detectVehicleType(text);

  if (vehicleType === "ebike") {
    const updated = await moveEbikeSessionToPlanSelection(session);

    return {
      handled: true,
      reply:
        `${intro}Sure, I can help with e-bike rental.\n\n` +
        makePriceOptionsReply({
          vehicleType: "ebike",
          pickupDate: updated.pickup_date,
        }),
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "ebike skips scooter licence check",
    };
  }

  const licenceResult = evaluateLicenceFromText(text);

  if (licenceResult.status === "eligible") {
    const updated = await updateBookingSession(session.id, {
      vehicle_type: "scooter",
      licence_status: "eligible",
      licence_notes: licenceResult.reason,
      stage: "plan_selection",
      metadata: mergeMetadata(session, {
        nero_introduced: true,
      }),
    });

    const safeSession = updated || session;

    const reply =
      `${intro}Perfect, thank you. Your licence sounds eligible for a 125cc scooter ✅\n\n` +
      makePriceOptionsReply({
        vehicleType: "scooter",
        pickupDate: safeSession.pickup_date,
      });

    return {
      handled: true,
      reply,
      session: safeSession,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "licence eligible",
    };
  }

  if (licenceResult.status === "not_eligible") {
    const updated = await updateBookingSession(session.id, {
      vehicle_type: "scooter",
      licence_status: "not_eligible",
      licence_notes: licenceResult.reason,
      metadata: mergeMetadata(session, {
        nero_introduced: true,
      }),
    });

    return {
      handled: true,
      reply:
        `${intro}Sorry, for 125cc scooters in Spain we can only accept a valid A1/A2/A licence, or a B car licence held for at least 3 years.\n\n` +
        `${licenceResult.reason}\n\n` +
        "If you prefer, I can also help you with an e-bike rental.",
      session: updated || session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "licence not eligible",
    };
  }

  if (licenceResult.status === "needs_team_review") {
    const updated = await markBookingSessionNeedsHuman(
      session.id,
      licenceResult.reason
    );

    return {
      handled: true,
      reply:
        `${intro}Thanks. This licence may need team review before we can confirm the rental.\n\n` +
        "Please bring the original driving licence and ID/passport at pickup. If it is a non-EU licence, you may also need an International Driving Permit.\n\n" +
        getNormalHumanHandoffMessage(),
      session: updated || session,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "licence needs team review",
    };
  }

  const updated = await updateBookingSession(session.id, {
    vehicle_type: "scooter",
    metadata: mergeMetadata(session, {
      nero_introduced: true,
    }),
  });

  return {
    handled: true,
    reply: `${intro}${getLicenceQuestion(language)}`,
    session: updated || session,
    shouldContinueToAi: false,
    needsHumanAttention: false,
    debugReason: "licence unclear",
  };
}

async function handlePlanStage(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const text = message.text || "";
  const detectedVehicleType = detectVehicleType(text);
  const vehicleType = detectedVehicleType || session.vehicle_type || "scooter";
  const rawPlanInfo = detectPlan(text);
  const planInfo = normalizePlanForVehicle(vehicleType, rawPlanInfo);
  const quantity = detectQuantity(text) || session.quantity || 1;

  if (!planInfo.plan) {
    return {
      handled: true,
      reply: makePriceOptionsReply({
        vehicleType,
        pickupDate: session.pickup_date,
      }),
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "plan missing",
    };
  }

  let updated = await updateBookingSession(session.id, {
    vehicle_type: vehicleType,
    quantity,
    plan: planInfo.plan,
    stage: "collect_date",
    metadata: mergeMetadata(session, {
      requested_days: planInfo.days || session.metadata?.requested_days || null,
      requested_hours: planInfo.hours || session.metadata?.requested_hours || null,
    }),
  });

  updated = updated || session;

  if (vehicleType === "ebike" && planInfo.plan === "multi_day") {
    updated =
      (await markBookingSessionNeedsHuman(
        updated.id,
        "E-bike multi-day rental requested. Team must confirm manually."
      )) || updated;

    return {
      handled: true,
      reply:
        "E-bikes are normally rented for up to 1 day. For more than 1 day, I’ll forward this to the team so they can confirm manually.",
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "ebike multi day needs human",
    };
  }

  return {
    handled: true,
    reply: "Great. What pickup date would you like?",
    session: updated,
    shouldContinueToAi: false,
    needsHumanAttention: false,
    debugReason: "plan collected",
  };
}

async function handleDateStage(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const pickupDate = detectDateText(message.text);

  if (!pickupDate) {
    return {
      handled: true,
      reply: "What pickup date would you like? You can send it like 06/06 or 2026-06-06.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "date missing",
    };
  }

  const updated =
    (await updateBookingSession(session.id, {
      pickup_date: pickupDate,
      stage: "collect_time",
    })) || session;

  return {
    handled: true,
    reply:
      "Perfect. What pickup time would you prefer?\n\nFor Half Day, pickup is between 09:30 and 13:00.\nFor Full Day, return time normally matches pickup time.",
    session: updated,
    shouldContinueToAi: false,
    needsHumanAttention: false,
    debugReason: "date collected",
  };
}

async function handleTimeStage(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const pickupTime = detectTimeText(message.text);

  if (!pickupTime) {
    return {
      handled: true,
      reply: "Please send the pickup time, for example 10:00 or 11:30.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "time missing",
    };
  }

  const plan = session.plan || "full_day";
  const requestedDays = Number(session.metadata?.requested_days || 1);
  const returnTime = pickupTime;

  let validation = {
    valid: true,
    needsHuman: false,
    reason: null as string | null,
  };

  if (plan === "half_day") {
    validation = validateHalfDayTimes({
      pickupTime,
      returnTime: "19:00",
    });
  } else if (plan === "full_day" || plan === "multi_day") {
    validation = validateFullDayTimes({
      pickupTime,
      returnTime,
    });
  }

  if (!validation.valid && validation.needsHuman) {
    const updated =
      (await markBookingSessionNeedsHuman(
        session.id,
        validation.reason || "Custom return time needs team review."
      )) || session;

    return {
      handled: true,
      reply:
        `${validation.reason}\n\n` +
        "I can forward this request to the team and they can confirm if an exception is possible.",
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "time needs human",
    };
  }

  if (!validation.valid) {
    return {
      handled: true,
      reply: validation.reason || "That time is not valid for this plan.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "invalid time",
    };
  }

  const updated =
    (await updateBookingSession(session.id, {
      pickup_time: pickupTime,
      return_time: returnTime,
      stage: "collect_customer_details",
      metadata: mergeMetadata(session, {
        requested_days: requestedDays,
      }),
    })) || session;

  return {
    handled: true,
    reply: "Great. Please send your full name and email so I can prepare the booking.",
    session: updated,
    shouldContinueToAi: false,
    needsHumanAttention: false,
    debugReason: "time collected",
  };
}

async function handleCustomerDetailsStage(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const text = message.text || "";
  const email = detectEmail(text) || session.customer_email;
  const name =
    detectCustomerName(text) || session.customer_name || message.customerName || null;

  if (!name || !email) {
    return {
      handled: true,
      reply: "Please send your full name and email address so I can prepare the booking.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "customer details missing",
    };
  }

  const vehicleType = session.vehicle_type || detectVehicleType(text) || "scooter";
  const quantity = session.quantity || detectQuantity(text) || 1;
  const requestedDays = Number(session.metadata?.requested_days || 1);
  const requestedHours = Number(session.metadata?.requested_hours || 1);

  let price;

  if (vehicleType === "ebike") {
    const isEbikeFullDay =
      session.plan === "ebike_day" ||
      session.plan === "full_day" ||
      requestedDays === 1;

    price = calculateEbikePrice({
      hours:
        session.plan === "ebike_hourly" && [1, 2, 3, 4].includes(requestedHours)
          ? (requestedHours as 1 | 2 | 3 | 4)
          : null,
      fullDay: isEbikeFullDay && session.plan !== "ebike_hourly",
      quantity,
    });
  } else {
    const scooterPlan: NeroScooterPlan =
      session.plan === "half_day"
        ? "half_day"
        : requestedDays > 1
          ? "multi_day"
          : "full_day";

    price = calculateScooterPrice({
      plan: scooterPlan,
      pickupDate: session.pickup_date,
      days: requestedDays,
      quantity,
    });
  }

  const season = session.pickup_date ? getNeroSeason(session.pickup_date) : null;

  const updated =
    (await updateBookingSession(session.id, {
      customer_name: name,
      customer_email: email,
      vehicle_type: vehicleType,
      quantity,
      total_amount: price.totalAmount,
      payment_amount: price.paymentAmount,
      remaining_amount: price.remainingAmount,
      deposit_amount: price.depositAmount,
      stage: "check_availability",
      metadata: mergeMetadata(session, {
        price_label: price.label,
        season,
      }),
    })) || session;

  return {
    handled: true,
    reply:
      "Perfect, I have the main details ✅\n\n" +
      `Estimated total: €${price.totalAmount}\n` +
      `To reserve: €${price.paymentAmount} online\n` +
      `Remaining at pickup: €${price.remainingAmount}\n` +
      `Deposit at pickup: €${price.depositAmount} by card or cash\n\n` +
      "Next I need to check live availability before sending the payment link.",
    session: updated,
    shouldContinueToAi: false,
    needsHumanAttention: false,
    debugReason: "customer details collected and price calculated",
  };
}

async function handleMediaMessage(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const mediaType = message.mediaType || "media";

  const updated = await updateBookingSession(session.id, {
    metadata: mergeMetadata(session, {
      last_media_received_at: new Date().toISOString(),
      last_media_type: mediaType,
    }),
  });

  if (mediaType === "image" || mediaType === "document") {
    return {
      handled: true,
      reply:
        "Thanks, I received the file/image ✅\n\n" +
        "If this is a driving licence, ID/passport, damage photo, or booking/payment screenshot, I’ll forward it to the team to check and confirm. Please also bring the original driving licence and ID/passport at pickup.",
      session: updated || session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "media acknowledged",
    };
  }

  return {
    handled: true,
    reply: "Thanks, I received it ✅ I’ll keep it with this chat for the team to review if needed.",
    session: updated || session,
    shouldContinueToAi: false,
    needsHumanAttention: false,
    debugReason: "media acknowledged generic",
  };
}

export async function runNeroBookingOrchestrator(
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const text = message.text || "";
  const intent = detectIntent(message);

  const sessionResult = await getSessionForIntent(message, intent);

  if (!sessionResult.session) {
    return {
      handled: false,
      reply: null,
      session: null,
      shouldContinueToAi: sessionResult.shouldContinueToAi,
      needsHumanAttention: false,
      debugReason: sessionResult.debugReason,
    };
  }

  let session = await updateSessionFromMessage(sessionResult.session, message);

  if (intent === "emergency" || shouldGiveEmergencyPhone(text)) {
    const updated =
      (await markBookingSessionNeedsHuman(
        session.id,
        "Emergency or urgent rental support."
      )) || session;

    return {
      handled: true,
      reply: getEmergencyHandoffMessage(),
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "emergency intent",
    };
  }

  if (intent === "owner") {
    return {
      handled: true,
      reply: getOwnerPrivacyMessage(),
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "owner privacy",
    };
  }

  if (intent === "location") {
    return {
      handled: true,
      reply: `We are located here:\n${NEXA_LOCATION_URL}`,
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "location",
    };
  }

  if (intent === "human") {
    const updated =
      (await markBookingSessionNeedsHuman(
        session.id,
        "Customer requested human/team review."
      )) || session;

    return {
      handled: true,
      reply: getNormalHumanHandoffMessage(),
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "normal human handoff",
    };
  }

  if (intent === "media") {
    return handleMediaMessage(session, message);
  }

  if (intent === "price" && session.stage === "licence_check") {
    const vehicleType = detectVehicleType(text) || session.vehicle_type || "scooter";

    return {
      handled: true,
      reply:
        makePriceOptionsReply({
          vehicleType,
          pickupDate: session.pickup_date,
        }) +
        (vehicleType === "scooter"
          ? "\n\nBefore booking a 125cc scooter, I’ll also need to confirm your licence eligibility."
          : "\n\nFor e-bikes, tell me which option you prefer and the pickup date."),
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "price before booking details",
    };
  }

  if (intent === "payment") {
    return {
      handled: true,
      reply: session.stripe_checkout_url
        ? `Your secure payment link is here:\n${session.stripe_checkout_url}\n\nOnce payment is completed, your booking can be confirmed.`
        : "The secure payment link is not ready yet. First I need to confirm the booking details and live availability.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "payment intent",
    };
  }

  if (session.stage === "licence_check") {
    const vehicleType = session.vehicle_type || detectVehicleType(text);

    if (vehicleType === "ebike") {
      session = await moveEbikeSessionToPlanSelection(session);
      return handlePlanStage(session, message);
    }

    return handleLicenceStage(session, message);
  }

  if (session.stage === "plan_selection") {
    return handlePlanStage(session, message);
  }

  if (session.stage === "collect_date") {
    return handleDateStage(session, message);
  }

  if (session.stage === "collect_time") {
    return handleTimeStage(session, message);
  }

  if (session.stage === "collect_customer_details") {
    return handleCustomerDetailsStage(session, message);
  }

  if (session.stage === "check_availability") {
    return {
      handled: true,
      reply:
        "I have the booking details ready. The next step is checking live availability from the NEXA booking system before creating the payment link.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "waiting for website availability integration",
    };
  }

  if (session.stage === "create_payment") {
    return {
      handled: true,
      reply:
        "I have the booking details ready. The next step is creating the secure 50% payment link.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "create payment stage pending integration",
    };
  }

  if (session.stage === "waiting_payment") {
    return {
      handled: true,
      reply: session.stripe_checkout_url
        ? `Your secure payment link is here:\n${session.stripe_checkout_url}\n\nOnce payment is completed, your booking can be confirmed.`
        : "Your payment link is being prepared. Once payment is completed, your booking can be confirmed.",
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "waiting payment",
    };
  }

  if (session.stage === "confirmed") {
    return {
      handled: false,
      reply: null,
      session,
      shouldContinueToAi: true,
      needsHumanAttention: false,
      debugReason: "booking already confirmed, let AI handle normal reply",
    };
  }

  if (session.stage === "needs_human") {
    return {
      handled: true,
      reply: getNormalHumanHandoffMessage(),
      session,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "needs human",
    };
  }

  if (intent === "unknown") {
    return {
      handled: false,
      reply: null,
      session,
      shouldContinueToAi: true,
      needsHumanAttention: false,
      debugReason: `unknown intent with active session. Session:\n${getBookingSessionSummary(
        session
      )}`,
    };
  }

  return {
    handled: true,
    reply: getNextQuestionForStage(session.stage, message.language),
    session,
    shouldContinueToAi: false,
    needsHumanAttention: false,
    debugReason: "fallback next question",
  };
}