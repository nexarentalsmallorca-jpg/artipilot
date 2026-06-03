import {
  calculateEbikePrice,
  calculateScooterPrice,
  evaluateLicenceFromText,
  getEbikePriceMessage,
  getEmergencyHandoffMessage,
  getNeroSeason,
  getOwnerPrivacyMessage,
  getScooterPriceMessage,
  NEXA_EMERGENCY_PHONE,
  NEXA_LOCATION_URL,
  shouldGiveEmergencyPhone,
  validateFullDayTimes,
  validateHalfDayTimes,
  type NeroScooterPlan,
} from "@/lib/booking/nexaBookingRules";

import {
  getActiveBookingSessionByContactId,
  getOrCreateBookingSession,
  markBookingSessionNeedsHuman,
  updateBookingSession,
  type BookingSession,
} from "@/lib/booking/whatsappBookingSession";

export type NeroIncomingMessage = {
  contactId: string;
  phone?: string | null;
  customerName?: string | null;
  text?: string | null;
  language?: string | null;
  hasMedia?: boolean;
  mediaType?: "image" | "document" | "video" | "audio" | "unknown" | null;
  isFirstCustomerChat?: boolean;
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
  | "support_problem"
  | "unknown";

type LanguageCode = "en" | "es" | "fr" | "it" | "de" | "pt" | "sv";

type DetectedPlan = {
  plan: "half_day" | "full_day" | "multi_day" | "ebike_hourly" | "ebike_day" | null;
  days: number | null;
  hours: 1 | 2 | 3 | 4 | null;
};

type AvailabilityResult =
  | {
      ok: true;
      checked: true;
      available: true;
      availableQuantity: number | null;
      source: "website_api";
    }
  | {
      ok: true;
      checked: true;
      available: false;
      availableQuantity: number | null;
      source: "website_api";
      reason: string;
    }
  | {
      ok: false;
      checked: false;
      available: null;
      availableQuantity: null;
      source: "not_configured" | "api_error";
      reason: string;
    };

const HUMAN_HOURS_24H = "08:30–13:00 and 16:00–20:00";
const HUMAN_HOURS_EN = "8:30 AM–1:00 PM and 4:00 PM–8:00 PM";

function normalizeText(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function cleanString(value: unknown): string {
  return String(value || "").trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function getLang(message?: NeroIncomingMessage | null): LanguageCode {
  const lang = normalizeText(message?.language);

  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("it")) return "it";
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("sv")) return "sv";

  const text = normalizeText(message?.text);

  if (
    hasAny(text, [
      "hola",
      "quiero",
      "alquilar",
      "precio",
      "cuanto",
      "cuánto",
      "direccion",
      "dirección",
      "carnet",
      "permiso",
      "hoy",
      "mañana",
      "manana",
    ])
  ) {
    return "es";
  }

  if (
    hasAny(text, [
      "bonjour",
      "salut",
      "je veux",
      "louer",
      "prix",
      "permis",
      "adresse",
      "réserver",
      "reserver",
      "demain",
    ])
  ) {
    return "fr";
  }

  if (
    hasAny(text, [
      "ciao",
      "vorrei",
      "noleggiare",
      "prenotare",
      "prezzo",
      "patente",
      "domani",
      "oggi",
    ])
  ) {
    return "it";
  }

  if (
    hasAny(text, [
      "hallo",
      "mieten",
      "preis",
      "führerschein",
      "fuehrerschein",
    ])
  ) {
    return "de";
  }

  return "en";
}

function humanHoursForLang(lang: LanguageCode) {
  return lang === "en" ? HUMAN_HOURS_EN : HUMAN_HOURS_24H;
}

function detectIntent(message: NeroIncomingMessage): DetectedIntent {
  const text = normalizeText(message.text);

  if (message.hasMedia) return "media";
  if (!text) return "unknown";

  if (
    hasAny(text, [
      "accident",
      "crash",
      "emergency",
      "injury",
      "injured",
      "hurt",
      "danger",
      "police",
      "ambulance",
      "hospital",
      "bleeding",
      "accidente",
      "herido",
      "peligro",
      "policia",
      "policía",
      "urgence",
      "blessé",
      "blesse",
      "incidente",
      "ferito",
    ])
  ) {
    return "emergency";
  }

  if (
    hasAny(text, [
      "not working",
      "stopped working",
      "scooter stopped",
      "scooter won't start",
      "scooter wont start",
      "battery died",
      "battery dead",
      "dead battery",
      "flat tyre",
      "flat tire",
      "puncture",
      "broken down",
      "breakdown",
      "problem with scooter",
      "problem with the scooter",
      "moto no arranca",
      "no funciona",
      "bateria",
      "batería",
      "pinchazo",
      "averia",
      "avería",
      "panne",
      "batterie",
      "crevaison",
      "non funziona",
      "batteria",
      "foratura",
    ])
  ) {
    return "support_problem";
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
      "reserver",
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

  if (/\bbike\b/.test(text)) return "ebike";

  return null;
}

function detectQuantity(textInput: string | null | undefined): number | null {
  const text = normalizeText(textInput);

  const qtyNearVehicle = text.match(
    /\b([1-9]|1[0-9]|20)\s*(scooters?|motos?|motorbikes?|e-?bikes?|bikes?|bicis?|bicicletas?)\b/
  );

  if (qtyNearVehicle) return Number(qtyNearVehicle[1]);

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
  if (vehicleType !== "ebike") return planInfo;

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

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function detectDateText(textInput: string | null | undefined): string | null {
  const raw = String(textInput || "").trim();
  const text = normalizeText(raw);
  const today = new Date();

  if (/\btoday\b|\bhoy\b|\baujourd'hui\b|\boggi\b/.test(text)) {
    return formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }

  if (/\btomorrow\b|\bmañana\b|\bmanana\b|\bdemain\b|\bdomani\b/.test(text)) {
    const tomorrow = addDays(today, 1);
    return formatDate(
      tomorrow.getFullYear(),
      tomorrow.getMonth() + 1,
      tomorrow.getDate()
    );
  }

  const isoMatch = raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const slashMatch = raw.match(
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
      : String(today.getFullYear());

    return `${year}-${month}-${day}`;
  }

  const monthNames: Record<string, number> = {
    january: 1,
    jan: 1,
    enero: 1,
    janvier: 1,
    february: 2,
    feb: 2,
    febrero: 2,
    fevrier: 2,
    février: 2,
    march: 3,
    mar: 3,
    marzo: 3,
    mars: 3,
    april: 4,
    apr: 4,
    abril: 4,
    avril: 4,
    may: 5,
    mayo: 5,
    mai: 5,
    june: 6,
    jun: 6,
    junio: 6,
    juin: 6,
    july: 7,
    jul: 7,
    julio: 7,
    juillet: 7,
    august: 8,
    aug: 8,
    agosto: 8,
    aout: 8,
    août: 8,
    september: 9,
    sep: 9,
    septiembre: 9,
    septembre: 9,
    october: 10,
    oct: 10,
    octubre: 10,
    octobre: 10,
    november: 11,
    nov: 11,
    noviembre: 11,
    novembre: 11,
    december: 12,
    dec: 12,
    diciembre: 12,
    decembre: 12,
    décembre: 12,
  };

  const monthAlternatives = Object.keys(monthNames).join("|");

  const dayMonthMatch = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthAlternatives})\\b`)
  );

  if (dayMonthMatch) {
    const day = Number(dayMonthMatch[1]);
    const month = monthNames[dayMonthMatch[2]];

    if (day >= 1 && day <= 31 && month) {
      return formatDate(today.getFullYear(), month, day);
    }
  }

  const monthDayMatch = text.match(
    new RegExp(`\\b(${monthAlternatives})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`)
  );

  if (monthDayMatch) {
    const month = monthNames[monthDayMatch[1]];
    const day = Number(monthDayMatch[2]);

    if (day >= 1 && day <= 31 && month) {
      return formatDate(today.getFullYear(), month, day);
    }
  }

  return null;
}

function detectTimeText(textInput: string | null | undefined): string | null {
  const text = normalizeText(textInput);

  const colonMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colonMatch) {
    return `${colonMatch[1].padStart(2, "0")}:${colonMatch[2]}`;
  }

  const hourWithSuffix = text.match(/\b([1-9]|1[0-9]|2[0-3])\s*(am|pm|h)\b/);
  if (hourWithSuffix) {
    let hour = Number(hourWithSuffix[1]);
    const suffix = hourWithSuffix[2];

    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:00`;
  }

  const timeWords = text.match(
    /\b(at|around|sobre|a las|vers|alle)\s+([1-9]|1[0-9]|2[0-3])\b/
  );

  if (timeWords) {
    return `${String(Number(timeWords[2])).padStart(2, "0")}:00`;
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

function isAffirmative(textInput: string | null | undefined): boolean {
  const text = normalizeText(textInput);

  return (
    /^(yes|yeah|yep|sure|correct|exactly|ok|okay|si|sí|claro|vale|oui|yes we have|yes i have|i have|we have|abbiamo|ja)\b/.test(
      text
    ) ||
    hasAny(text, [
      "yes i have",
      "yes we have",
      "i have it",
      "we have it",
      "i have licence",
      "i have license",
      "we have licence",
      "we have license",
      "b licence",
      "b license",
      "3 years",
      "more than 3",
      "more than three",
      "tengo carnet",
      "tenemos carnet",
      "j'ai le permis",
      "nous avons le permis",
    ])
  );
}

function isNegative(textInput: string | null | undefined): boolean {
  const text = normalizeText(textInput);
  return /^(no|nope|not|dont|don't|do not|non|no tengo|sin carnet)\b/.test(text);
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

function formatDateForCustomer(date: string | null | undefined) {
  if (!date) return null;

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function vehicleLabel(vehicleType: "scooter" | "ebike" | null | undefined) {
  if (vehicleType === "ebike") return "e-bike";
  return "125cc scooter";
}

function pluralVehicleLabel(
  vehicleType: "scooter" | "ebike" | null | undefined,
  quantity: number | null | undefined
) {
  const qty = quantity || 1;

  if (vehicleType === "ebike") {
    return qty === 1 ? "e-bike" : "e-bikes";
  }

  return qty === 1 ? "125cc scooter" : "125cc scooters";
}

function planLabel(session: BookingSession) {
  if (session.plan === "half_day") return "Half Day";
  if (session.plan === "full_day") return "1 day / 24 hours";
  if (session.plan === "multi_day") {
    const days = Number(session.metadata?.requested_days || 2);
    return `${days} days`;
  }
  if (session.plan === "ebike_hourly") {
    const hours = Number(session.metadata?.requested_hours || 1);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (session.plan === "ebike_day") return "1 day";
  return null;
}

function makeBookingContext(session: BookingSession) {
  const parts = [];
  const qty = session.quantity || 1;

  if (session.vehicle_type) {
    parts.push(`${qty} ${pluralVehicleLabel(session.vehicle_type, qty)}`);
  }

  const date = formatDateForCustomer(session.pickup_date);
  if (date) parts.push(`for ${date}`);

  if (session.pickup_time) parts.push(`at ${session.pickup_time}`);

  const plan = planLabel(session);
  if (plan) parts.push(`(${plan})`);

  return parts.join(" ");
}

function getNormalHumanMessage(lang: LanguageCode) {
  if (lang === "es") {
    return `El equipo puede revisar este chat cuando esté disponible. El horario de atención humana es ${humanHoursForLang(
      lang
    )}, pero Nero AI puede ayudarte 24/7 aquí.`;
  }

  if (lang === "fr") {
    return `L’équipe peut vérifier ce chat dès qu’elle est disponible. Les horaires d’assistance humaine sont ${humanHoursForLang(
      lang
    )}, mais l’assistance Nero AI reste disponible 24/7 ici.`;
  }

  if (lang === "it") {
    return `Il team può controllare questa chat quando è disponibile. L’orario dell’assistenza umana è ${humanHoursForLang(
      lang
    )}, ma l’assistenza Nero AI è disponibile 24/7 qui.`;
  }

  if (lang === "de") {
    return `Das Team kann diesen Chat prüfen, sobald es verfügbar ist. Die menschlichen Supportzeiten sind ${humanHoursForLang(
      lang
    )}, aber Nero AI kann hier 24/7 weiterhelfen.`;
  }

  return `The team can review this chat when available. Human support hours are ${humanHoursForLang(
    lang
  )}, but Nero AI support is available 24/7 here.`;
}

function getUrgentRentalSupportMessage(lang: LanguageCode) {
  if (lang === "es") {
    return [
      "Siento que haya pasado esto. Primero, por favor ponte en un lugar seguro y no conduzcas el scooter si no es seguro.",
      `Para soporte urgente de NEXA Rentals, contacta al equipo por WhatsApp: ${NEXA_EMERGENCY_PHONE}.`,
      `El horario de atención humana es ${humanHoursForLang(
        lang
      )}, pero Nero AI puede ayudarte 24/7 aquí.`,
      "Si hay heridos, peligro, policía o una emergencia grave, llama al 112 inmediatamente.",
    ].join("\n");
  }

  if (lang === "fr") {
    return [
      "Je suis désolé que cela soit arrivé. D’abord, mettez-vous en sécurité et ne conduisez pas le scooter si ce n’est pas sûr.",
      `Pour une assistance urgente NEXA Rentals, contactez l’équipe sur WhatsApp : ${NEXA_EMERGENCY_PHONE}.`,
      `Les horaires d’assistance humaine sont ${humanHoursForLang(
        lang
      )}, mais Nero AI reste disponible 24/7 ici.`,
      "S’il y a un blessé, un danger, la police ou une urgence grave, appelez immédiatement le 112.",
    ].join("\n");
  }

  if (lang === "it") {
    return [
      "Mi dispiace che sia successo. Prima di tutto, mettiti in un posto sicuro e non guidare lo scooter se non è sicuro.",
      `Per supporto urgente NEXA Rentals, contatta il team su WhatsApp: ${NEXA_EMERGENCY_PHONE}.`,
      `L’assistenza umana è disponibile ${humanHoursForLang(
        lang
      )}, ma Nero AI è disponibile 24/7 qui.`,
      "Se ci sono feriti, pericolo, polizia o una vera emergenza, chiama subito il 112.",
    ].join("\n");
  }

  return [
    "I’m sorry this happened. First, please stay in a safe place and do not ride the scooter if it feels unsafe.",
    `For urgent NEXA Rentals support, contact the team on WhatsApp: ${NEXA_EMERGENCY_PHONE}.`,
    `Human support hours are ${humanHoursForLang(
      lang
    )}, but Nero AI support is available 24/7 here.`,
    "If anyone is injured, in danger, police are involved, or it is a serious emergency, call 112 immediately.",
  ].join("\n");
}

function getSeriousEmergencyMessage(lang: LanguageCode) {
  if (lang === "es") {
    return [
      "Lo siento mucho. Primero, asegúrate de que todos estén seguros.",
      "Si hay heridos, peligro, policía o una emergencia grave, llama al 112 inmediatamente.",
      `Para soporte urgente de NEXA Rentals, contacta al equipo por WhatsApp: ${NEXA_EMERGENCY_PHONE}.`,
    ].join("\n");
  }

  if (lang === "fr") {
    return [
      "Je suis vraiment désolé. D’abord, assurez-vous que tout le monde est en sécurité.",
      "S’il y a un blessé, un danger, la police ou une urgence grave, appelez immédiatement le 112.",
      `Pour une assistance urgente NEXA Rentals, contactez l’équipe sur WhatsApp : ${NEXA_EMERGENCY_PHONE}.`,
    ].join("\n");
  }

  if (lang === "it") {
    return [
      "Mi dispiace molto. Prima di tutto, assicurati che tutti siano al sicuro.",
      "Se ci sono feriti, pericolo, polizia o una vera emergenza, chiama subito il 112.",
      `Per supporto urgente NEXA Rentals, contatta il team su WhatsApp: ${NEXA_EMERGENCY_PHONE}.`,
    ].join("\n");
  }

  return getEmergencyHandoffMessage();
}

function getLocationReply(lang: LanguageCode) {
  if (lang === "es") {
    return `Estamos en Magaluf. Aquí tienes la ubicación:\n${NEXA_LOCATION_URL}`;
  }

  if (lang === "fr") {
    return `Nous sommes situés à Magaluf. Voici le lien de localisation :\n${NEXA_LOCATION_URL}`;
  }

  if (lang === "it") {
    return `Siamo a Magaluf. Ecco il link della posizione:\n${NEXA_LOCATION_URL}`;
  }

  return `We are located in Magaluf. Here is the location link:\n${NEXA_LOCATION_URL}`;
}

function getLicenceQuestion(lang: LanguageCode) {
  if (lang === "es") {
    return "¿Los conductores tienen carnet A1/A2/A, o carnet B de coche con al menos 3 años?";
  }

  if (lang === "fr") {
    return "Les conducteurs ont-ils un permis A1/A2/A, ou un permis B voiture depuis au moins 3 ans ?";
  }

  if (lang === "it") {
    return "I conducenti hanno una patente A1/A2/A, oppure una patente B da almeno 3 anni?";
  }

  if (lang === "de") {
    return "Haben die Fahrer einen A1/A2/A Führerschein oder einen B-Autoführerschein seit mindestens 3 Jahren?";
  }

  return "Do the drivers have valid A1/A2/A licences, or B car licences held for at least 3 years?";
}

function getMissingFields(session: BookingSession): string[] {
  const missing: string[] = [];
  const vehicleType = session.vehicle_type || "scooter";

  if (!session.vehicle_type) missing.push("vehicle_type");

  if (vehicleType === "scooter" && session.licence_status !== "eligible") {
    missing.push("licence");
  }

  if (!session.pickup_date) missing.push("pickup_date");
  if (!session.plan) missing.push("plan");
  if (!session.pickup_time) missing.push("pickup_time");

  if (!session.customer_name || !session.customer_email) {
    missing.push("customer_details");
  }

  return missing;
}

function makeSmartNextReply(
  session: BookingSession,
  message: NeroIncomingMessage,
  intro = ""
): string {
  const lang = getLang(message);
  const context = makeBookingContext(session);
  const vehicleType = session.vehicle_type || "scooter";
  const missing = getMissingFields(session);

  const prefix = context
    ? `${intro}Perfect, I can help with ${context}.`
    : `${intro}Perfect, I can help with that.`;

  const needsLicence = missing.includes("licence");
  const needsDate = missing.includes("pickup_date");
  const needsPlan = missing.includes("plan");
  const needsTime = missing.includes("pickup_time");
  const needsCustomerDetails = missing.includes("customer_details");

  if (vehicleType === "ebike") {
    if (needsDate && needsPlan) {
      return `${prefix}\n\nWhat date would you like it for, and which e-bike option do you prefer: 1 hour, 2 hours, 3 hours, 4 hours, or 1 day?`;
    }

    if (needsDate) return `${prefix}\n\nWhat pickup date would you like?`;
    if (needsPlan) {
      return `${prefix}\n\nWhich e-bike option do you prefer: 1 hour, 2 hours, 3 hours, 4 hours, or 1 day?`;
    }
    if (needsTime) return `${prefix}\n\nWhat pickup time would you prefer?`;
    if (needsCustomerDetails) {
      return `${prefix}\n\nPlease send your full name and email so I can prepare the booking.`;
    }

    return `${prefix}\n\nLet me check availability before preparing the payment link.`;
  }

  if (needsLicence && needsPlan) {
    return `${prefix}\n\nBefore checking availability, ${getLicenceQuestion(
      lang
    )}\n\nAlso, would you prefer Half Day or 1 day / 24 hours?`;
  }

  if (needsLicence && needsDate) {
    return `${prefix}\n\nBefore checking availability, ${getLicenceQuestion(
      lang
    )}\n\nAlso, what pickup date would you like?`;
  }

  if (needsLicence) {
    return `${prefix}\n\nBefore checking availability, ${getLicenceQuestion(lang)}`;
  }

  if (needsDate) return `${prefix}\n\nWhat pickup date would you like?`;

  if (needsPlan) {
    return `${prefix}\n\nWhich plan would you like: Half Day, 1 day / 24 hours, or multiple days?`;
  }

  if (needsTime) return `${prefix}\n\nWhat pickup time would you prefer?`;

  if (needsCustomerDetails) {
    return `${prefix}\n\nPlease send your full name and email so I can prepare the booking.`;
  }

  return `${prefix}\n\nLet me check live availability before preparing the payment link.`;
}

function getPriceReply(session: BookingSession, message: NeroIncomingMessage) {
  const vehicleType = detectVehicleType(message.text) || session.vehicle_type || "scooter";
  const priceText =
    vehicleType === "ebike"
      ? getEbikePriceMessage()
      : getScooterPriceMessage(session.pickup_date);

  const context = makeBookingContext(session);
  const after =
    vehicleType === "scooter"
      ? "For your booking, would you prefer Half Day or 1 day / 24 hours?"
      : "For your booking, which e-bike option would you prefer?";

  return context
    ? `${priceText}\n\nFor ${context}, ${after.charAt(0).toLowerCase()}${after.slice(1)}`
    : `${priceText}\n\n${after}`;
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
      nero_introduced: true,
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

  if (vehicleType && !session.vehicle_type) patch.vehicle_type = vehicleType;

  const quantity = detectQuantity(text);
  if (quantity && (!session.quantity || session.quantity === 1)) {
    patch.quantity = quantity;
  }

  const rawPlanInfo = detectPlan(text);
  const planInfo = finalVehicleType
    ? normalizePlanForVehicle(finalVehicleType, rawPlanInfo)
    : rawPlanInfo;

  if (planInfo.plan) {
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
  if (pickupDate) patch.pickup_date = pickupDate;

  const pickupTime = detectTimeText(text);
  if (pickupTime) patch.pickup_time = pickupTime;

  const email = detectEmail(text);
  if (email) patch.customer_email = email;

  const customerName = detectCustomerName(text) || message.customerName;
  if (customerName && !session.customer_name) patch.customer_name = customerName;

  if (Object.keys(metadataPatch).length > 0) {
    patch.metadata = mergeMetadata(session, metadataPatch);
  }

  if (Object.keys(patch).length === 0) return session;

  const updated = await updateBookingSession(session.id, patch);
  return updated || session;
}

async function markLicenceEligible(
  session: BookingSession,
  reason: string
): Promise<BookingSession> {
  const updated = await updateBookingSession(session.id, {
    vehicle_type: "scooter",
    licence_status: "eligible",
    licence_notes: reason,
    metadata: mergeMetadata(session, {
      asked_licence: true,
    }),
  });

  return updated || session;
}

async function calculateAndSavePrice(
  session: BookingSession
): Promise<BookingSession> {
  const vehicleType = session.vehicle_type || "scooter";
  const quantity = session.quantity || 1;
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

  const updated = await updateBookingSession(session.id, {
    total_amount: price.totalAmount,
    payment_amount: price.paymentAmount,
    remaining_amount: price.remainingAmount,
    deposit_amount: price.depositAmount,
    metadata: mergeMetadata(session, {
      price_label: price.label,
      season,
    }),
  });

  return updated || session;
}

function getWebsiteAvailabilityConfig() {
  const url =
    process.env.NEXA_WEBSITE_AVAILABILITY_URL?.trim() ||
    process.env.NEXA_INTERNAL_AVAILABILITY_URL?.trim();

  const secret =
    process.env.NEXA_WEBSITE_INTERNAL_SECRET?.trim() ||
    process.env.NEXA_INTERNAL_API_SECRET?.trim();

  if (!url || !secret) return null;

  return { url, secret };
}

async function checkLiveAvailability(
  session: BookingSession
): Promise<AvailabilityResult> {
  const config = getWebsiteAvailabilityConfig();

  if (!config) {
    return {
      ok: false,
      checked: false,
      available: null,
      availableQuantity: null,
      source: "not_configured",
      reason:
        "Live availability API is not configured yet in Artipilot. Team must confirm manually.",
    };
  }

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.secret}`,
      },
      body: JSON.stringify({
        source: "artipilot_whatsapp",
        contactId: session.contact_id,
        sessionId: session.id,
        vehicleType: session.vehicle_type,
        quantity: session.quantity || 1,
        plan: session.plan,
        pickupDate: session.pickup_date,
        pickupTime: session.pickup_time,
        returnDate: session.return_date,
        returnTime: session.return_time,
        requestedDays: session.metadata?.requested_days || null,
        requestedHours: session.metadata?.requested_hours || null,
      }),
    });

    const data = (await response.json().catch(() => null)) as {
      available?: boolean;
      availableQuantity?: number | null;
      reason?: string;
    } | null;

    if (!response.ok) {
      return {
        ok: false,
        checked: false,
        available: null,
        availableQuantity: null,
        source: "api_error",
        reason:
          data?.reason ||
          `Website availability API failed with status ${response.status}.`,
      };
    }

    const availableQuantity =
      typeof data?.availableQuantity === "number" ? data.availableQuantity : null;

    if (data?.available === true) {
      return {
        ok: true,
        checked: true,
        available: true,
        availableQuantity,
        source: "website_api",
      };
    }

    return {
      ok: true,
      checked: true,
      available: false,
      availableQuantity,
      source: "website_api",
      reason: data?.reason || "Requested quantity is not available.",
    };
  } catch (error) {
    return {
      ok: false,
      checked: false,
      available: null,
      availableQuantity: null,
      source: "api_error",
      reason:
        error instanceof Error
          ? error.message
          : "Website availability API request failed.",
    };
  }
}

function getAvailabilityUnavailableReply(
  session: BookingSession,
  availability: AvailabilityResult,
  lang: LanguageCode
) {
  const requested = session.quantity || 1;
  const available = availability.availableQuantity;

  if (lang === "es") {
    return available !== null
      ? `Para la fecha seleccionada solo veo ${available} disponible(s), pero has pedido ${requested}.\n\nVoy a pasar esta solicitud al equipo para que intenten ayudarte, por ejemplo revisando otra solución o una unidad con empresa colaboradora si es posible.`
      : `No puedo confirmar disponibilidad automáticamente para esta solicitud.\n\nVoy a pasarla al equipo para que la revisen y te ayuden con la mejor solución posible.`;
  }

  if (lang === "fr") {
    return available !== null
      ? `Pour la date sélectionnée, je vois seulement ${available} disponible(s), mais vous avez demandé ${requested}.\n\nJe vais transmettre cette demande à l’équipe pour qu’elle essaie de vous aider, par exemple avec une autre solution ou une unité via une entreprise partenaire si possible.`
      : `Je ne peux pas confirmer automatiquement la disponibilité pour cette demande.\n\nJe vais la transmettre à l’équipe afin qu’elle vérifie et vous propose la meilleure solution possible.`;
  }

  return available !== null
    ? `For the selected date, I can only see ${available} available, but you requested ${requested}.\n\nI’ll pass this to the team so they can try to help, for example by checking another solution or arranging an extra unit through a partner company if possible.`
    : `I can’t automatically confirm live availability for this request yet.\n\nI’ll pass it to the team so they can check and help with the best possible solution.`;
}

async function handleAvailabilityCheck(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const lang = getLang(message);
  const pricedSession = await calculateAndSavePrice(session);
  const availability = await checkLiveAvailability(pricedSession);

  if (availability.ok && availability.available) {
    const updated =
      (await updateBookingSession(pricedSession.id, {
        stage: "create_payment",
        metadata: mergeMetadata(pricedSession, {
          availability_checked: true,
          availability_source: availability.source,
          available_quantity: availability.availableQuantity,
        }),
      })) || pricedSession;

    return {
      handled: true,
      reply:
        "Great, the main booking details look ready and availability looks possible ✅\n\n" +
        `Estimated total: €${updated.total_amount}\n` +
        `To reserve: €${updated.payment_amount} online\n` +
        `Remaining at pickup: €${updated.remaining_amount}\n` +
        `Deposit at pickup: €${updated.deposit_amount} by card or cash\n\n` +
        "Next step: I’ll prepare the secure 50% payment link.",
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "availability available",
    };
  }

  const updated =
    (await markBookingSessionNeedsHuman(
      pricedSession.id,
      availability.reason || "Availability needs team review."
    )) || pricedSession;

  return {
    handled: true,
    reply: getAvailabilityUnavailableReply(updated, availability, lang),
    session: updated,
    shouldContinueToAi: false,
    needsHumanAttention: true,
    debugReason: "availability unavailable or not configured",
  };
}

async function continueBookingFlow(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<NeroOrchestratorResult> {
  const vehicleType = session.vehicle_type || "scooter";
  const missing = getMissingFields(session);

  if (missing.length > 0) {
    return {
      handled: true,
      reply: makeSmartNextReply(session, message),
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: `asking missing fields: ${missing.join(", ")}`,
    };
  }

  if (vehicleType === "scooter" && session.plan === "half_day") {
    const validation = validateHalfDayTimes({
      pickupTime: session.pickup_time,
      returnTime: "19:00",
    });

    if (!validation.valid) {
      return {
        handled: true,
        reply: validation.reason || "That time is not valid for Half Day.",
        session,
        shouldContinueToAi: false,
        needsHumanAttention: false,
        debugReason: "invalid half day time",
      };
    }
  }

  if (
    vehicleType === "scooter" &&
    (session.plan === "full_day" || session.plan === "multi_day")
  ) {
    const validation = validateFullDayTimes({
      pickupTime: session.pickup_time,
      returnTime: session.return_time || session.pickup_time,
    });

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
          "I’ll pass this request to the team so they can confirm if an exception is possible.",
        session: updated,
        shouldContinueToAi: false,
        needsHumanAttention: true,
        debugReason: "time needs human",
      };
    }
  }

  const updated =
    (await updateBookingSession(session.id, {
      stage: "check_availability",
    })) || session;

  return handleAvailabilityCheck(updated, message);
}

async function handleLicenceLogic(
  session: BookingSession,
  message: NeroIncomingMessage
): Promise<BookingSession> {
  const text = message.text || "";
  const vehicleType = session.vehicle_type || detectVehicleType(text);

  if (vehicleType === "ebike") {
    const updated = await updateBookingSession(session.id, {
      vehicle_type: "ebike",
      licence_status: "eligible",
      licence_notes: "E-bike flow does not require 125cc scooter licence check.",
    });

    return updated || session;
  }

  if (isNegative(text)) {
    const updated = await updateBookingSession(session.id, {
      vehicle_type: "scooter",
      licence_status: "not_eligible",
      licence_notes: "Customer said they do not have the required licence.",
    });

    return updated || session;
  }

  const licenceResult = evaluateLicenceFromText(text);

  if (licenceResult.status === "eligible" || isAffirmative(text)) {
    return markLicenceEligible(
      session,
      licenceResult.status === "eligible"
        ? licenceResult.reason
        : "Customer confirmed they have the required licence."
    );
  }

  if (licenceResult.status === "not_eligible") {
    const updated = await updateBookingSession(session.id, {
      vehicle_type: "scooter",
      licence_status: "not_eligible",
      licence_notes: licenceResult.reason,
    });

    return updated || session;
  }

  if (licenceResult.status === "needs_team_review") {
    const updated =
      (await markBookingSessionNeedsHuman(session.id, licenceResult.reason)) ||
      session;

    return updated;
  }

  const updated = await updateBookingSession(session.id, {
    vehicle_type: "scooter",
    metadata: mergeMetadata(session, {
      asked_licence: true,
    }),
  });

  return updated || session;
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
    reply:
      "Thanks, I received it ✅ I’ll keep it with this chat for the team to review if needed.",
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
  const lang = getLang(message);

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
        "Emergency or serious safety issue."
      )) || session;

    return {
      handled: true,
      reply: getSeriousEmergencyMessage(lang),
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "serious emergency intent",
    };
  }

  if (intent === "support_problem") {
    const updated =
      (await markBookingSessionNeedsHuman(
        session.id,
        "Urgent active rental support problem."
      )) || session;

    return {
      handled: true,
      reply: getUrgentRentalSupportMessage(lang),
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "urgent rental support problem",
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
      reply: getLocationReply(lang),
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
      reply: getNormalHumanMessage(lang),
      session: updated,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "normal human handoff",
    };
  }

  if (intent === "media") {
    return handleMediaMessage(session, message);
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

  if (intent === "price") {
    return {
      handled: true,
      reply: getPriceReply(session, message),
      session,
      shouldContinueToAi: false,
      needsHumanAttention: false,
      debugReason: "price question answered before stage logic",
    };
  }

  if (intent === "licence" || session.stage === "licence_check") {
    session = await handleLicenceLogic(session, message);

    if (session.status === "needs_human" || session.stage === "needs_human") {
      return {
        handled: true,
        reply:
          "Thanks. This needs team review before we can confirm the rental.\n\n" +
          getNormalHumanMessage(lang),
        session,
        shouldContinueToAi: false,
        needsHumanAttention: true,
        debugReason: "licence needs human review",
      };
    }

    if (session.licence_status === "not_eligible") {
      return {
        handled: true,
        reply:
          "For 125cc scooters in Spain, the drivers need a valid A1/A2/A licence, or a B car licence held for at least 3 years.\n\n" +
          "If you don’t have that, I can help you with e-bikes instead.",
        session,
        shouldContinueToAi: false,
        needsHumanAttention: false,
        debugReason: "licence not eligible",
      };
    }
  }

  if (intent === "booking" || session.status === "active") {
    return continueBookingFlow(session, message);
  }

  if (session.stage === "create_payment") {
    return {
      handled: true,
      reply:
        "The booking details are ready. The next step is creating the secure 50% payment link.",
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
      reply: getNormalHumanMessage(lang),
      session,
      shouldContinueToAi: false,
      needsHumanAttention: true,
      debugReason: "needs human",
    };
  }

  return {
    handled: false,
    reply: null,
    session,
    shouldContinueToAi: true,
    needsHumanAttention: false,
    debugReason: "letting OpenAI handle natural non-booking reply",
  };
}