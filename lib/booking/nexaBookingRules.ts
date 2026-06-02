export type NeroVehicleType = "scooter" | "ebike";

export type NeroSeason = "early" | "peak" | "late" | "winter";

export type NeroScooterPlan = "half_day" | "full_day" | "multi_day";

export type NeroEbikePlan =
  | "ebike_1_hour"
  | "ebike_2_hours"
  | "ebike_3_hours"
  | "ebike_4_hours"
  | "ebike_1_day";

export type NeroLicenceResultStatus =
  | "eligible"
  | "not_eligible"
  | "needs_team_review"
  | "unknown";

export type NeroLicenceResult = {
  status: NeroLicenceResultStatus;
  reason: string;
  nextStage:
    | "plan_selection"
    | "licence_check"
    | "needs_human";
};

export type NeroPriceResult = {
  vehicleType: NeroVehicleType;
  plan: NeroScooterPlan | NeroEbikePlan;
  season?: NeroSeason;
  days?: number;
  hours?: number;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  paymentAmount: number;
  remainingAmount: number;
  depositAmount: number;
  label: string;
};

export type NeroBookingTimeValidation = {
  valid: boolean;
  needsHuman: boolean;
  reason: string | null;
};

export const NEXA_DEPOSIT_AMOUNT = 150;

export const NEXA_LOCATION_URL = "https://maps.app.goo.gl/PnKZwtithzMFYNmZA";

export const NEXA_HUMAN_SUPPORT_HOURS =
  "08:30–13:00 and 16:00–20:00";

export const NEXA_EMERGENCY_PHONE = "612566850";

export const SCOOTER_PRICES: Record<
  NeroSeason,
  {
    halfDay: number;
    dayPrices: Record<number, number>;
  }
> = {
  early: {
    halfDay: 34,
    dayPrices: {
      1: 42,
      2: 40,
      3: 39,
      4: 38,
      5: 37,
      6: 36,
    },
  },
  peak: {
    halfDay: 39,
    dayPrices: {
      1: 49,
      2: 47,
      3: 46,
      4: 45,
      5: 44,
      6: 43,
    },
  },
  late: {
    halfDay: 36,
    dayPrices: {
      1: 45,
      2: 43,
      3: 42,
      4: 41,
      5: 40,
      6: 39,
    },
  },
  winter: {
    halfDay: 32,
    dayPrices: {
      1: 39,
      2: 37,
      3: 36,
      4: 35,
      5: 34,
      6: 33,
    },
  },
};

export const EBIKE_PRICES = {
  1: 9,
  2: 16,
  3: 21,
  4: 25,
  day: 28,
};

export const HALF_DAY_PICKUP_START = "09:30";
export const HALF_DAY_PICKUP_END = "13:00";

export const HALF_DAY_RETURN_OPTIONS = ["19:00", "19:30", "20:00"];

export function getNeroSeason(dateInput?: string | Date | null): NeroSeason {
  const date = dateInput ? new Date(dateInput) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "peak";
  }

  const month = date.getMonth() + 1;

  if (month === 5) return "early";
  if (month >= 6 && month <= 8) return "peak";
  if (month === 9 || month === 10) return "late";

  return "winter";
}

export function getSeasonLabel(season: NeroSeason): string {
  if (season === "early") return "Early Season";
  if (season === "peak") return "Peak Season";
  if (season === "late") return "Late Season";
  return "Winter Season";
}

export function normalizeText(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function calculateScooterPrice(input: {
  plan: NeroScooterPlan;
  pickupDate?: string | null;
  days?: number | null;
  quantity?: number | null;
}): NeroPriceResult {
  const quantity = Math.max(1, Number(input.quantity || 1));
  const season = getNeroSeason(input.pickupDate);
  const prices = SCOOTER_PRICES[season];

  if (input.plan === "half_day") {
    const totalAmount = prices.halfDay * quantity;

    return {
      vehicleType: "scooter",
      plan: "half_day",
      season,
      days: 0,
      unitPrice: prices.halfDay,
      quantity,
      totalAmount,
      paymentAmount: roundMoney(totalAmount / 2),
      remainingAmount: roundMoney(totalAmount / 2),
      depositAmount: NEXA_DEPOSIT_AMOUNT,
      label: `Half Day — €${prices.halfDay}`,
    };
  }

  const days = Math.min(6, Math.max(1, Number(input.days || 1)));
  const unitPrice = prices.dayPrices[days] ?? prices.dayPrices[6];
  const totalAmount = unitPrice * days * quantity;

  return {
    vehicleType: "scooter",
    plan: days === 1 ? "full_day" : "multi_day",
    season,
    days,
    unitPrice,
    quantity,
    totalAmount,
    paymentAmount: roundMoney(totalAmount / 2),
    remainingAmount: roundMoney(totalAmount / 2),
    depositAmount: NEXA_DEPOSIT_AMOUNT,
    label:
      days === 1
        ? `Full Day / 24 hours — €${unitPrice}`
        : `${days} days — €${unitPrice}/day`,
  };
}

export function calculateEbikePrice(input: {
  hours?: 1 | 2 | 3 | 4 | null;
  fullDay?: boolean | null;
  quantity?: number | null;
}): NeroPriceResult {
  const quantity = Math.max(1, Number(input.quantity || 1));

  if (input.fullDay) {
    const totalAmount = EBIKE_PRICES.day * quantity;

    return {
      vehicleType: "ebike",
      plan: "ebike_1_day",
      hours: 24,
      unitPrice: EBIKE_PRICES.day,
      quantity,
      totalAmount,
      paymentAmount: roundMoney(totalAmount / 2),
      remainingAmount: roundMoney(totalAmount / 2),
      depositAmount: NEXA_DEPOSIT_AMOUNT,
      label: `E-bike 1 day — €${EBIKE_PRICES.day}`,
    };
  }

  const hours = input.hours && [1, 2, 3, 4].includes(input.hours)
    ? input.hours
    : 1;

  const unitPrice = EBIKE_PRICES[hours];
  const totalAmount = unitPrice * quantity;

  return {
    vehicleType: "ebike",
    plan: `ebike_${hours}_hour${hours === 1 ? "" : "s"}` as NeroEbikePlan,
    hours,
    unitPrice,
    quantity,
    totalAmount,
    paymentAmount: roundMoney(totalAmount / 2),
    remainingAmount: roundMoney(totalAmount / 2),
    depositAmount: NEXA_DEPOSIT_AMOUNT,
    label: `E-bike ${hours} hour${hours === 1 ? "" : "s"} — €${unitPrice}`,
  };
}

export function getScooterPriceMessage(dateInput?: string | null): string {
  const season = getNeroSeason(dateInput);
  const prices = SCOOTER_PRICES[season];

  return [
    `${getSeasonLabel(season)} scooter prices:`,
    `Half Day: €${prices.halfDay}`,
    `1 day / 24h: €${prices.dayPrices[1]}`,
    `2 days: €${prices.dayPrices[2]}/day`,
    `3 days: €${prices.dayPrices[3]}/day`,
    `4 days: €${prices.dayPrices[4]}/day`,
    `5 days: €${prices.dayPrices[5]}/day`,
    `6 days: €${prices.dayPrices[6]}/day`,
  ].join("\n");
}

export function getEbikePriceMessage(): string {
  return [
    "E-bike prices:",
    "1 hour: €9",
    "2 hours: €16",
    "3 hours: €21",
    "4 hours: €25",
    "1 day: €28",
    "For more than 1 day, the team needs to confirm manually.",
  ].join("\n");
}

export function evaluateLicenceFromText(message: string): NeroLicenceResult {
  const text = normalizeText(message);

  const mentionsProvisional =
    text.includes("provisional") ||
    text.includes("learner") ||
    text.includes("learning licence") ||
    text.includes("learners licence") ||
    text.includes("l plate") ||
    text.includes("l-plate") ||
    text.includes("permiso provisional");

  if (mentionsProvisional) {
    return {
      status: "not_eligible",
      reason:
        "Provisional or learner licences are not accepted for 125cc scooters in Spain.",
      nextStage: "licence_check",
    };
  }

  const mentionsExpired =
    text.includes("expired") ||
    text.includes("caducado") ||
    text.includes("caducada") ||
    text.includes("expirado") ||
    text.includes("expirada");

  if (mentionsExpired) {
    return {
      status: "not_eligible",
      reason: "Expired licences are not accepted.",
      nextStage: "licence_check",
    };
  }

  const mentionsMotorbikeLicence =
    /\ba1\b/.test(text) ||
    /\ba2\b/.test(text) ||
    /\ba\b/.test(text) ||
    text.includes("motorbike licence") ||
    text.includes("motorcycle licence") ||
    text.includes("moto licence") ||
    text.includes("permiso a1") ||
    text.includes("permiso a2");

  if (mentionsMotorbikeLicence) {
    return {
      status: "eligible",
      reason: "Customer says they have A/A1/A2 licence.",
      nextStage: "plan_selection",
    };
  }

  const mentionsB =
    /\bb\b/.test(text) ||
    text.includes("car licence") ||
    text.includes("driving licence b") ||
    text.includes("licence b") ||
    text.includes("license b") ||
    text.includes("permiso b") ||
    text.includes("carnet b") ||
    text.includes("car license");

  const mentionsThreeYears =
    text.includes("3 years") ||
    text.includes("three years") ||
    text.includes("more than 3") ||
    text.includes("over 3") ||
    text.includes("3+ years") ||
    text.includes("4 years") ||
    text.includes("5 years") ||
    text.includes("6 years") ||
    text.includes("7 years") ||
    text.includes("8 years") ||
    text.includes("9 years") ||
    text.includes("10 years") ||
    text.includes("more than three") ||
    text.includes("desde hace 3") ||
    text.includes("mas de 3") ||
    text.includes("más de 3");

  if (mentionsB && mentionsThreeYears) {
    return {
      status: "eligible",
      reason: "Customer says they have B car licence held for at least 3 years.",
      nextStage: "plan_selection",
    };
  }

  if (mentionsB && !mentionsThreeYears) {
    return {
      status: "unknown",
      reason:
        "Customer mentioned B car licence, but has not clearly confirmed it has been held for at least 3 years.",
      nextStage: "licence_check",
    };
  }

  const mentionsNonEu =
    text.includes("morocco") ||
    text.includes("moroccan") ||
    text.includes("uk licence") ||
    text.includes("british licence") ||
    text.includes("usa licence") ||
    text.includes("american licence") ||
    text.includes("non eu") ||
    text.includes("non-eu") ||
    text.includes("international driving permit") ||
    text.includes("idp");

  if (mentionsNonEu) {
    return {
      status: "needs_team_review",
      reason:
        "Non-EU or unclear licence may require original licence plus International Driving Permit and team review.",
      nextStage: "needs_human",
    };
  }

  return {
    status: "unknown",
    reason:
      "Licence eligibility is not clear yet. Need A1/A2/A or B car licence held for at least 3 years.",
    nextStage: "licence_check",
  };
}

export function getLicenceQuestion(languageHint?: string | null): string {
  const lang = normalizeText(languageHint);

  if (lang.startsWith("es")) {
    return "Antes de comprobar disponibilidad, ¿tienes un carnet A1/A2/A o un carnet B de coche con más de 3 años?";
  }

  if (lang.startsWith("fr")) {
    return "Avant de vérifier la disponibilité, avez-vous un permis A1/A2/A ou un permis voiture B depuis au moins 3 ans ?";
  }

  if (lang.startsWith("it")) {
    return "Prima di controllare la disponibilità, hai una patente A1/A2/A oppure una patente B da almeno 3 anni?";
  }

  if (lang.startsWith("de")) {
    return "Bevor ich die Verfügbarkeit prüfe: Hast du einen A1/A2/A Führerschein oder einen B-Autoführerschein seit mindestens 3 Jahren?";
  }

  return "Before checking availability, do you have a valid A1/A2/A licence, or a B car licence held for at least 3 years?";
}

export function validateHalfDayTimes(input: {
  pickupTime?: string | null;
  returnTime?: string | null;
}): NeroBookingTimeValidation {
  const pickupTime = input.pickupTime || "";
  const returnTime = input.returnTime || "";

  if (!pickupTime || !returnTime) {
    return {
      valid: false,
      needsHuman: false,
      reason: "Pickup time and return time are required for Half Day bookings.",
    };
  }

  if (!isTimeBetween(pickupTime, HALF_DAY_PICKUP_START, HALF_DAY_PICKUP_END)) {
    return {
      valid: false,
      needsHuman: false,
      reason: `Half Day pickup must be between ${HALF_DAY_PICKUP_START} and ${HALF_DAY_PICKUP_END}.`,
    };
  }

  if (!HALF_DAY_RETURN_OPTIONS.includes(returnTime)) {
    return {
      valid: false,
      needsHuman: false,
      reason: `Half Day return must be ${HALF_DAY_RETURN_OPTIONS.join(", ")}.`,
    };
  }

  return {
    valid: true,
    needsHuman: false,
    reason: null,
  };
}

export function validateFullDayTimes(input: {
  pickupTime?: string | null;
  returnTime?: string | null;
}): NeroBookingTimeValidation {
  const pickupTime = input.pickupTime || "";
  const returnTime = input.returnTime || "";

  if (!pickupTime || !returnTime) {
    return {
      valid: false,
      needsHuman: false,
      reason: "Pickup time and return time are required.",
    };
  }

  if (pickupTime !== returnTime) {
    return {
      valid: false,
      needsHuman: true,
      reason:
        "For Full Day bookings, the return time normally matches the pickup time because it works in 24-hour blocks. The team must confirm any exception manually.",
    };
  }

  return {
    valid: true,
    needsHuman: false,
    reason: null,
  };
}

export function shouldGiveEmergencyPhone(message: string): boolean {
  const text = normalizeText(message);

  return (
    text.includes("accident") ||
    text.includes("injury") ||
    text.includes("hurt") ||
    text.includes("danger") ||
    text.includes("emergency") ||
    text.includes("urgent") ||
    text.includes("police") ||
    text.includes("stopped working") ||
    text.includes("not working") ||
    text.includes("broken down") ||
    text.includes("breakdown") ||
    text.includes("flat tyre") ||
    text.includes("flat tire") ||
    text.includes("puncture") ||
    text.includes("pinchazo") ||
    text.includes("accidente") ||
    text.includes("panne") ||
    text.includes("urgence")
  );
}

export function getEmergencyHandoffMessage(): string {
  return [
    "I’m sorry this happened. First, please make sure you are safe.",
    "If there is danger, injury, police involvement, or a serious emergency, call 112 immediately.",
    `For urgent NEXA rental support, you can contact the team on WhatsApp: ${NEXA_EMERGENCY_PHONE}.`,
  ].join("\n");
}

export function getNormalHumanHandoffMessage(): string {
  return `The team can review this chat when available. Human support hours are ${NEXA_HUMAN_SUPPORT_HOURS}, but I’ll keep helping you here in the meantime.`;
}

export function getOwnerPrivacyMessage(): string {
  return "For privacy reasons, I can’t share owner or internal staff details. I can still help you here with bookings, prices, licence requirements, location, or rental questions.";
}

export function getPaymentConfirmationMessage(input: {
  vehicleLabel?: string | null;
  planLabel?: string | null;
  pickup?: string | null;
  returnTime?: string | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
  depositAmount?: number | null;
}): string {
  return [
    "Perfect, your booking is confirmed ✅",
    "",
    "Booking details:",
    input.vehicleLabel || "Scooter rental",
    input.planLabel ? `Plan: ${input.planLabel}` : null,
    input.pickup ? `Pickup: ${input.pickup}` : null,
    input.returnTime ? `Return: ${input.returnTime}` : null,
    input.paidAmount !== null && input.paidAmount !== undefined
      ? `Paid online: €${input.paidAmount}`
      : null,
    input.remainingAmount !== null && input.remainingAmount !== undefined
      ? `Remaining at pickup: €${input.remainingAmount}`
      : null,
    `Deposit: €${input.depositAmount ?? NEXA_DEPOSIT_AMOUNT} by card or cash`,
    "",
    "Please bring your original driving licence and ID/passport at pickup. See you at NEXA Rentals.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function isTimeBetween(time: string, start: string, end: string): boolean {
  const currentMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (
    currentMinutes === null ||
    startMinutes === null ||
    endMinutes === null
  ) {
    return false;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}