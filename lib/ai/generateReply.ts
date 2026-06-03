import { buildNexaSystemPrompt } from "@/lib/ai/nexaBrain";
import {
  getActiveBookingSessionByContactId,
  getBookingSessionSummary,
  markBookingSessionNeedsHuman,
} from "@/lib/booking/whatsappBookingSession";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type GenerateAiReplyParams = {
  customerMessage: string;
  recentMessages?: ChatTurn[];
  isFirstCustomerChat?: boolean;
  humanHandback?: boolean;

  contactId?: string | null;
  phone?: string | null;
  customerName?: string | null;
  detectedLanguage?: string | null;
  hasMedia?: boolean;
  mediaType?: "image" | "document" | "video" | "audio" | "unknown" | null;
};

export type EnglishTranslationResult = {
  englishTranslation: string | null;
  detectedLanguage: string | null;
  translationStatus: "done" | "skipped" | "failed";
};

type OpenAIChatCompletionResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
  };
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeText(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function getModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function extractJsonObject(value: string): Record<string, unknown> | null {
  const clean = cleanText(value);

  if (!clean) {
    return null;
  }

  try {
    const parsed = JSON.parse(clean);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Try extracting JSON from wrapped/markdown response.
  }

  const match = clean.match(/\{[\s\S]*\}/);

  if (!match?.[0]) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[0]);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeLanguageCode(value: unknown) {
  const language = cleanText(value).toLowerCase();

  if (!language) return "unknown";

  const map: Record<string, string> = {
    english: "en",
    spanish: "es",
    español: "es",
    french: "fr",
    français: "fr",
    italian: "it",
    italiano: "it",
    german: "de",
    deutsch: "de",
    portuguese: "pt",
    português: "pt",
    swedish: "sv",
    svenska: "sv",
  };

  return map[language] || language.slice(0, 8);
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function isSeriousEmergencyMessage(message: string) {
  const text = normalizeText(message);

  return hasAny(text, [
    "accident",
    "crash",
    "injury",
    "injured",
    "hurt",
    "danger",
    "police",
    "ambulance",
    "hospital",
    "bleeding",
    "emergency",
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
  ]);
}

function isUrgentRentalProblem(message: string) {
  const text = normalizeText(message);

  return hasAny(text, [
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
  ]);
}

function guessLanguage(params: GenerateAiReplyParams) {
  const detected = normalizeLanguageCode(params.detectedLanguage);

  if (detected && detected !== "unknown") {
    return detected;
  }

  const text = normalizeText(params.customerMessage);

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

function buildEmergencyReply(params: GenerateAiReplyParams, serious: boolean) {
  const lang = guessLanguage(params);

  if (lang === "es") {
    return serious
      ? [
          "Lo siento mucho. Primero, asegúrate de que todos estén seguros.",
          "Si hay heridos, peligro, policía o una emergencia grave, llama al 112 inmediatamente.",
          "Para soporte urgente de NEXA Rentals, contacta al equipo por WhatsApp: 612566850.",
        ].join("\n")
      : [
          "Siento que haya pasado esto. Primero, ponte en un lugar seguro y no conduzcas el scooter si no es seguro.",
          "Para soporte urgente de NEXA Rentals, contacta al equipo por WhatsApp: 612566850.",
          "El horario de atención humana es 08:30–13:00 y 16:00–20:00, pero Nero AI puede ayudarte 24/7 aquí.",
          "Si hay heridos, peligro, policía o una emergencia grave, llama al 112 inmediatamente.",
        ].join("\n");
  }

  if (lang === "fr") {
    return serious
      ? [
          "Je suis vraiment désolé. D’abord, assurez-vous que tout le monde est en sécurité.",
          "S’il y a un blessé, un danger, la police ou une urgence grave, appelez immédiatement le 112.",
          "Pour une assistance urgente NEXA Rentals, contactez l’équipe sur WhatsApp : 612566850.",
        ].join("\n")
      : [
          "Je suis désolé que cela soit arrivé. D’abord, mettez-vous en sécurité et ne conduisez pas le scooter si ce n’est pas sûr.",
          "Pour une assistance urgente NEXA Rentals, contactez l’équipe sur WhatsApp : 612566850.",
          "Les horaires d’assistance humaine sont 08:30–13:00 et 16:00–20:00, mais Nero AI reste disponible 24/7 ici.",
          "S’il y a un blessé, un danger, la police ou une urgence grave, appelez immédiatement le 112.",
        ].join("\n");
  }

  if (lang === "it") {
    return serious
      ? [
          "Mi dispiace molto. Prima di tutto, assicurati che tutti siano al sicuro.",
          "Se ci sono feriti, pericolo, polizia o una vera emergenza, chiama subito il 112.",
          "Per supporto urgente NEXA Rentals, contatta il team su WhatsApp: 612566850.",
        ].join("\n")
      : [
          "Mi dispiace che sia successo. Prima di tutto, mettiti in un posto sicuro e non guidare lo scooter se non è sicuro.",
          "Per supporto urgente NEXA Rentals, contatta il team su WhatsApp: 612566850.",
          "L’assistenza umana è disponibile 08:30–13:00 e 16:00–20:00, ma Nero AI è disponibile 24/7 qui.",
          "Se ci sono feriti, pericolo, polizia o una vera emergenza, chiama subito il 112.",
        ].join("\n");
  }

  return serious
    ? [
        "I’m really sorry this happened. First, please make sure everyone is safe.",
        "If anyone is injured, in danger, police are involved, or it is a serious emergency, call 112 immediately.",
        "For urgent NEXA Rentals support, contact the team on WhatsApp: 612566850.",
      ].join("\n")
    : [
        "I’m sorry this happened. First, please stay in a safe place and do not ride the scooter if it feels unsafe.",
        "For urgent NEXA Rentals support, contact the team on WhatsApp: 612566850.",
        "Human support hours are 8:30 AM–1:00 PM and 4:00 PM–8:00 PM, but Nero AI support is available 24/7 here.",
        "If anyone is injured, in danger, police are involved, or it is a serious emergency, call 112 immediately.",
      ].join("\n");
}

async function maybeHandleCriticalSafety(params: GenerateAiReplyParams) {
  const message = cleanText(params.customerMessage);

  if (!message) return null;

  const serious = isSeriousEmergencyMessage(message);
  const urgentRentalProblem = isUrgentRentalProblem(message);

  if (!serious && !urgentRentalProblem) {
    return null;
  }

  if (params.contactId) {
    try {
      await markBookingSessionNeedsHuman(
        params.contactId,
        serious
          ? "Emergency or serious safety issue mentioned in WhatsApp chat."
          : "Urgent active rental support problem mentioned in WhatsApp chat."
      );
    } catch (error) {
      console.error("[NERO_CRITICAL_SAFETY_MARK_HUMAN_FAILED]", error);
    }
  }

  return buildEmergencyReply(params, serious);
}

async function getBookingSessionContext(params: GenerateAiReplyParams) {
  const contactId = cleanText(params.contactId);

  if (!contactId) {
    return "No booking session memory is available for this customer.";
  }

  try {
    const session = await getActiveBookingSessionByContactId(contactId);

    if (!session) {
      return "No active booking session exists yet. Use the conversation history to understand the customer naturally.";
    }

    return getBookingSessionSummary(session);
  } catch (error) {
    console.error("[NERO_BOOKING_SESSION_CONTEXT_FAILED]", error);

    return "Booking session memory could not be loaded. Use the conversation history and do not invent confirmed availability or payment.";
  }
}

function buildNeroIndependentBrain(params: GenerateAiReplyParams, bookingContext: string) {
  const isFirstCustomerChat = Boolean(params.isFirstCustomerChat);
  const humanHandback = Boolean(params.humanHandback);
  const detectedLanguage = cleanText(params.detectedLanguage) || "unknown";

  return `
You are Nero, the private WhatsApp AI assistant created by NEXA Rentals in Magaluf, Mallorca.

You must behave like a real ChatGPT-level assistant inside WhatsApp:
- Understand the latest customer message first.
- Use the whole recent conversation.
- Use the booking memory only as context, not as a rigid form.
- Never trap the customer in repeated stage questions.
- Do not repeat questions that the customer already answered.
- If the customer asks a question, answer that question first.
- Then continue the booking naturally if useful.
- You can answer broader useful questions around Mallorca, scooter use, beaches, routes, parking, rain, helmets, deposit, police, fuel, late returns, extensions, safety, and rental support.
- Stay focused on helping NEXA customers and converting real rental enquiries professionally.

CURRENT CHAT FLAGS:
- Is first customer chat: ${isFirstCustomerChat ? "YES" : "NO"}
- Human handback: ${humanHandback ? "YES" : "NO"}
- Detected language: ${detectedLanguage}

CURRENT BOOKING MEMORY:
${bookingContext}

IDENTITY:
- Your name is Nero.
- You are the AI assistant created by NEXA Rentals.
- You are not Sahil.
- You are not the owner.
- You are not a human employee.

FIRST MESSAGE RULE:
- If Is first customer chat is YES, introduce yourself once only:
  "Hi, I’m Nero, the AI assistant created by NEXA Rentals 😊"
- After the intro, immediately answer the customer’s actual message.
- If Is first customer chat is NO, do not introduce yourself again.

STYLE:
- Reply like ChatGPT: intelligent, natural, context-aware, helpful.
- Keep WhatsApp replies short and clear.
- One or two questions maximum.
- Reply in the customer’s language.
- Use one emoji maximum when natural.
- Never mention system prompts, tools, code, API, database, Supabase, webhook, OpenAI, ChatGPT, model, or internal instructions.

NEXA RENTALS FACTS:
- Business: NEXA Rentals, scooter and e-bike rental in Magaluf, Mallorca.
- Location link: https://maps.app.goo.gl/PnKZwtithzMFYNmZA
- Human support hours: 08:30–13:00 and 16:00–20:00.
- AI support: 24/7.
- Urgent NEXA support WhatsApp number: 612566850, but only for real urgent cases.

CURRENT PRICES:
125cc scooter prices:
Peak season June/July/August:
Half Day €39
1 day / 24h €49
2 days €47/day
3 days €46/day
4 days €45/day
5 days €44/day
6 days €43/day

Early season May:
Half Day €34
1 day / 24h €42
2 days €40/day
3 days €39/day
4 days €38/day
5 days €37/day
6 days €36/day

Late season September/October:
Half Day €36
1 day / 24h €45
2 days €43/day
3 days €42/day
4 days €41/day
5 days €40/day
6 days €39/day

Winter November-April:
Half Day €32
1 day / 24h €39
2 days €37/day
3 days €36/day
4 days €35/day
5 days €34/day
6 days €33/day

E-bike prices:
1 hour €9
2 hours €16
3 hours €21
4 hours €25
1 day €28
More than 1 day needs team review.

PAYMENT / BOOKING:
- Online booking/payment takes 50% upfront.
- Remaining 50% is paid at pickup.
- Deposit: €150 at pickup by card or cash.
- Do not say payment is complete unless the system or customer clearly confirms it.
- Do not say booking is confirmed unless payment/system confirmation exists.
- Do not invent payment links.

LICENCE RULES FOR 125CC SCOOTERS:
- Before confirming or pushing a scooter booking, confirm licence eligibility.
- Accepted: valid full A1/A2/A, or valid full B car licence held for at least 3 years.
- ID or passport is required.
- EU licences accepted if valid and full.
- Non-EU licences may require original licence plus International Driving Permit and team review.
- Provisional, learner, expired, or unclear invalid licences are not accepted in Spain.
- UK provisional rules do not apply in Spain.

LICENCE PHOTO / ID PHOTO:
- If customer sends licence/ID/passport photo, do not approve it yourself.
- Say the team will check and confirm.
- Remind customer to bring original driving licence and ID/passport at pickup.

AVAILABILITY:
- Never invent live availability.
- If customer requests quantity/date/time, say availability needs to be checked before confirmation.
- If not enough vehicles are available, say the team can review options, including partner company help if possible.
- For complex group bookings or custom return times, pass to team review.

URGENT SUPPORT:
- If serious accident, injury, danger, police, ambulance, or emergency: tell customer to call 112 immediately.
- If active rental problem like scooter stopped, battery died, puncture, flat tyre, mechanical issue: tell customer to stay safe and contact urgent NEXA support on WhatsApp 612566850.
- Mention human support hours and that Nero AI is available 24/7.
- Do not casually give 612566850 for normal booking/price/location questions.

PRIVACY:
If customer asks who owns the company or wants owner/staff/private details:
"For privacy reasons, I can’t share owner or internal staff details. I can still help you here with bookings, prices, licence requirements, location, or rental questions."

CONVERSATION INTELLIGENCE:
- If customer asks "what are the prices?", answer prices directly.
- If customer says "I need 2 scooters tomorrow at 10", understand: quantity 2, scooter, tomorrow, 10:00. Do not ask date again.
- If customer says "yes" after licence question, understand it as confirmation when context makes it clear.
- If customer already gave date, do not ask for date again.
- If customer already gave time, do not ask for time again.
- If customer already gave quantity, do not ask quantity again.
- If customer asks something outside rentals but useful for tourist/scooter context, answer helpfully and bring it back naturally to rental support.
- If you are unsure, ask the smallest useful next question.
`.trim();
}

function buildStrictSafetyLayer() {
  return `
Before replying, silently check:
1. Did I answer the customer's latest message first?
2. Did I avoid repeating an already answered question?
3. Did I reply in the customer’s language?
4. Did I avoid inventing availability, payment, discounts, rules, or booking confirmation?
5. If scooter booking is involved, did I handle licence eligibility correctly?
6. If urgent/safety issue is involved, did I give correct safety guidance?
7. Did I avoid giving 612566850 unless it is urgent or truly necessary?
8. Did I keep the reply natural, helpful, and WhatsApp-friendly?

Only output the final customer-facing WhatsApp message.
`.trim();
}

function buildMessages(params: GenerateAiReplyParams, bookingContext: string) {
  const customerMessage = cleanText(params.customerMessage);

  const history = (params.recentMessages || [])
    .filter((message) => cleanText(message.content))
    .slice(-24)
    .map((message) => ({
      role: message.role,
      content: cleanText(message.content),
    }));

  return [
    {
      role: "system" as const,
      content: [
        buildNexaSystemPrompt(),
        buildNeroIndependentBrain(params, bookingContext),
        buildStrictSafetyLayer(),
      ].join("\n\n"),
    },
    ...history,
    {
      role: "user" as const,
      content: customerMessage,
    },
  ];
}

function cleanAiReply(reply: string) {
  return reply
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\s+$/g, "")
    .trim();
}

function removeRepeatedIntro(reply: string) {
  let cleanReply = cleanAiReply(reply);

  cleanReply = cleanReply
    .replace(/^hi,\s*i['’]m\s+nero,?\s*/i, "")
    .replace(/^hello,\s*i['’]m\s+nero,?\s*/i, "")
    .replace(/^hey,\s*i['’]m\s+nero,?\s*/i, "")
    .replace(/^i['’]m\s+nero,?\s*/i, "")
    .replace(/^nero\s+here,?\s*/i, "")
    .replace(/^it['’]s\s+nero,?\s*/i, "")
    .replace(/^the\s+ai\s+assistant\s+created\s+by\s+nexa\s+rentals,?\s*/i, "")
    .replace(/^the\s+nexa\s+rentals\s+ai\s+assistant,?\s*/i, "")
    .replace(/^nexa\s+rentals\s+ai\s+assistant,?\s*/i, "")
    .replace(/^ai\s+assistant\s+created\s+by\s+nexa\s+rentals,?\s*/i, "")
    .replace(/^i\s+am\s+the\s+ai\s+assistant\s+created\s+by\s+nexa\s+rentals,?\s*/i, "")
    .replace(/^i['’]m\s+the\s+ai\s+assistant\s+created\s+by\s+nexa\s+rentals,?\s*/i, "")
    .trim();

  return cleanAiReply(cleanReply);
}

function checkForbiddenPrivateWording(reply: string) {
  const cleanReply = cleanAiReply(reply);

  const forbiddenPatterns = [
    /system prompt/i,
    /openai/i,
    /chatgpt/i,
    /language model/i,
    /\bAI model\b/i,
    /internal rule/i,
    /database/i,
    /webhook/i,
    /\bapi\b/i,
    /dashboard/i,
    /supabase/i,
    /vercel/i,
    /tool/i,
    /according to my instructions/i,
    /based on the provided rules/i,
  ];

  const matchedForbiddenPattern = forbiddenPatterns.find((pattern) =>
    pattern.test(cleanReply)
  );

  if (matchedForbiddenPattern) {
    throw new Error("AI reply included internal/private wording.");
  }

  return cleanReply;
}

function validateReply(reply: string, params: GenerateAiReplyParams) {
  let cleanReply = checkForbiddenPrivateWording(reply);

  if (!cleanReply) {
    throw new Error("OpenAI returned an empty reply.");
  }

  if (!params.isFirstCustomerChat) {
    cleanReply = removeRepeatedIntro(cleanReply);

    if (!cleanReply) {
      throw new Error("AI reply became empty after removing repeated intro.");
    }
  }

  return cleanReply;
}

export async function generateAiReply(params: GenerateAiReplyParams) {
  const customerMessage = cleanText(params.customerMessage);
  const hasMedia = Boolean(params.hasMedia);

  if (!customerMessage && !hasMedia) {
    throw new Error("Customer message is empty.");
  }

  const safetyReply = await maybeHandleCriticalSafety(params);

  if (safetyReply) {
    return safetyReply;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OpenAI is not configured.");
  }

  const bookingContext = await getBookingSessionContext(params);
  const model = getModel();

  const messages = buildMessages(
    {
      customerMessage: customerMessage || "[media received]",
      recentMessages: params.recentMessages || [],
      isFirstCustomerChat: Boolean(params.isFirstCustomerChat),
      humanHandback: Boolean(params.humanHandback),
      contactId: params.contactId,
      phone: params.phone,
      customerName: params.customerName,
      detectedLanguage: params.detectedLanguage,
      hasMedia: params.hasMedia,
      mediaType: params.mediaType,
    },
    bookingContext
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.45,
      max_completion_tokens: 420,
      presence_penalty: 0,
      frequency_penalty: 0.15,
    }),
  });

  const rawText = await response.text();

  let data: OpenAIChatCompletionResponse = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errorMessage =
      data.error?.message || rawText || "OpenAI request failed.";

    throw new Error(errorMessage);
  }

  return validateReply(data.choices?.[0]?.message?.content || "", params);
}

export async function translateMessageToEnglish(
  text: string
): Promise<EnglishTranslationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const cleanInput = cleanText(text);

  if (!cleanInput) {
    return {
      englishTranslation: null,
      detectedLanguage: null,
      translationStatus: "skipped",
    };
  }

  if (!apiKey) {
    console.error("[ARTIPILOT_TRANSLATION_NO_OPENAI_KEY]");

    return {
      englishTranslation: null,
      detectedLanguage: null,
      translationStatus: "failed",
    };
  }

  try {
    const model = getModel();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `
You are a translation engine for a private WhatsApp inbox.

Detect the input language and translate the input into natural English.

Return ONLY valid JSON with this exact shape:
{
  "detectedLanguage": "en|es|fr|de|it|pt|sv|unknown",
  "englishTranslation": "translated English text",
  "shouldDisplay": true
}

Rules:
- If input is already English, set shouldDisplay to false.
- If input is not English, set shouldDisplay to true.
- If input is mixed, translate the non-English parts and set shouldDisplay to true.
- Preserve prices, dates, times, names, phone numbers, URLs, emojis and business details exactly.
- Do not answer the message.
- Do not explain anything.
`.trim(),
          },
          {
            role: "user",
            content: cleanInput,
          },
        ],
        temperature: 0,
        max_completion_tokens: 220,
        presence_penalty: 0,
        frequency_penalty: 0,
        response_format: {
          type: "json_object",
        },
      }),
    });

    const rawText = await response.text();

    let data: OpenAIChatCompletionResponse = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      console.error("[ARTIPILOT_TRANSLATION_OPENAI_FAILED]", {
        error: data.error?.message || rawText || "OpenAI translation failed.",
      });

      return {
        englishTranslation: null,
        detectedLanguage: null,
        translationStatus: "failed",
      };
    }

    const content = cleanText(data.choices?.[0]?.message?.content);
    const parsed = extractJsonObject(content);

    if (!parsed) {
      console.error("[ARTIPILOT_TRANSLATION_JSON_PARSE_FAILED]", {
        content,
      });

      return {
        englishTranslation: null,
        detectedLanguage: null,
        translationStatus: "failed",
      };
    }

    const detectedLanguage = normalizeLanguageCode(parsed.detectedLanguage);
    const englishTranslation = cleanText(parsed.englishTranslation);
    const shouldDisplay = parsed.shouldDisplay === true;

    console.log("[ARTIPILOT_TRANSLATION_RESULT]", {
      detectedLanguage,
      shouldDisplay,
      hasTranslation: Boolean(englishTranslation),
      inputPreview: cleanInput.slice(0, 60),
      translationPreview: englishTranslation.slice(0, 60),
    });

    if (!shouldDisplay || !englishTranslation) {
      return {
        englishTranslation: null,
        detectedLanguage,
        translationStatus: "skipped",
      };
    }

    if (englishTranslation.toLowerCase() === cleanInput.toLowerCase()) {
      return {
        englishTranslation: null,
        detectedLanguage,
        translationStatus: "skipped",
      };
    }

    return {
      englishTranslation,
      detectedLanguage,
      translationStatus: "done",
    };
  } catch (error) {
    console.error("[ARTIPILOT_TRANSLATION_FAILED]", error);

    return {
      englishTranslation: null,
      detectedLanguage: null,
      translationStatus: "failed",
    };
  }
}