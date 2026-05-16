export type ArtipilotChatMessage = {
  role: "customer" | "assistant" | "manual" | "system";
  direction: "inbound" | "outbound";
  content: string | null;
  created_at?: string | null;
};

export type ArtipilotAiInput = {
  businessName?: string;
  businessType?: string;
  mainLanguage?: string;
  aiJob?: string;
  businessRules?: string;
  customerName?: string | null;
  customerPhone: string;
  customerMessage: string;
  recentMessages?: ArtipilotChatMessage[];
};

type OpenAIResponseContentItem = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutputItem = {
  type?: string;
  content?: OpenAIResponseContentItem[];
};

type OpenAIResponsesApiResult = {
  output_text?: string;
  output?: OpenAIResponseOutputItem[];
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string;
  };
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

function extractOpenAIText(data: OpenAIResponsesApiResult) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts: string[] = [];

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item.content)) continue;

      for (const contentItem of item.content) {
        if (typeof contentItem.text === "string" && contentItem.text.trim()) {
          parts.push(contentItem.text.trim());
        }
      }
    }
  }

  return parts.join("\n").trim();
}

function formatRecentMessages(messages?: ArtipilotChatMessage[]) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "No previous conversation history is available.";
  }

  return messages
    .filter((message) => String(message.content || "").trim())
    .slice(-18)
    .map((message) => {
      const speaker =
        message.role === "customer"
          ? "Customer"
          : message.role === "assistant"
            ? "Nero AI"
            : message.role === "manual"
              ? "Human team"
              : "System";

      return `${speaker}: ${String(message.content || "").trim()}`;
    })
    .join("\n");
}

function cleanupPossibleName(name: string) {
  return name
    .replace(/[.,!?;:()[\]{}"'“”‘’].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBadNameCandidate(name: string) {
  const clean = name.trim().toLowerCase();

  if (!clean) return true;

  const badWords = [
    "unknown",
    "me",
    "myself",
    "not sure",
    "booking",
    "scooter",
    "scooters",
    "rent",
    "rental",
    "tomorrow",
    "today",
    "yesterday",
    "available",
    "availability",
    "license",
    "licence",
    "car",
    "bike",
    "human",
    "team",
    "ai",
    "assistant",
    "nero",
    "am",
    "a1",
    "a2",
    "a",
    "b",
    "yes",
    "no",
    "ok",
    "okay",
    "fine",
    "thanks",
    "thank you",
    "hello",
    "hi",
    "hey",
  ];

  if (badWords.includes(clean)) return true;
  if (clean.length < 2) return true;
  if (clean.length > 40) return true;
  if (/\d/.test(clean)) return true;

  return false;
}

function detectKnownName({
  customerName,
  recentMessages,
}: {
  customerName?: string | null;
  recentMessages?: ArtipilotChatMessage[];
}) {
  const cleanSupabaseName = cleanupPossibleName(String(customerName || ""));

  if (
    cleanSupabaseName &&
    cleanSupabaseName.toLowerCase() !== "unknown" &&
    !isBadNameCandidate(cleanSupabaseName)
  ) {
    return cleanSupabaseName;
  }

  const customerMessages = (recentMessages || [])
    .filter((message) => message.role === "customer")
    .map((message) => String(message.content || "").trim())
    .filter(Boolean);

  const historyText = customerMessages.join("\n");

  const patterns = [
    /\bmy name is\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bname is\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bi am\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bi'm\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bim\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bme llamo\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bsoy\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bje m'appelle\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bich heiße\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
    /\bich heisse\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40})/i,
  ];

  for (const pattern of patterns) {
    const match = historyText.match(pattern);
    const possibleName = cleanupPossibleName(match?.[1] || "");

    if (possibleName && !isBadNameCandidate(possibleName)) {
      return possibleName;
    }
  }

  return "";
}

function isDirectNameQuestion(message: string) {
  const clean = message.trim().toLowerCase().replace(/\s+/g, " ");

  return [
    "who am i",
    "who am i?",
    "who i am",
    "who i am?",
    "do you know my name",
    "do you know my name?",
    "what is my name",
    "what is my name?",
    "tell me my name",
    "tell me my name?",
  ].includes(clean);
}

function isSimpleGreeting(message: string) {
  const clean = message.trim().toLowerCase().replace(/[.!?]/g, "");

  return [
    "hi",
    "hello",
    "hey",
    "hola",
    "buenas",
    "bonjour",
    "hallo",
    "ciao",
    "olá",
    "ola",
  ].includes(clean);
}

function customerAskedForHuman(message: string) {
  const clean = message.toLowerCase();

  const phrases = [
    "human",
    "real person",
    "real human",
    "team",
    "staff",
    "manager",
    "agent",
    "talk to someone",
    "speak to someone",
    "talk to your team",
    "speak with your team",
    "pass me to",
    "connect me",
    "call me",
  ];

  return phrases.some((phrase) => clean.includes(phrase));
}

function asksPrivateOwnerInfo(message: string) {
  const clean = message.toLowerCase();

  const phrases = [
    "who is the owner",
    "who owns",
    "owner name",
    "company owner",
    "business owner",
    "who is your boss",
    "who is the boss",
    "who is sahil",
    "internal staff",
    "staff details",
    "who founded",
    "founder name",
  ];

  return phrases.some((phrase) => clean.includes(phrase));
}

function asksAboutAmLicense(message: string) {
  const clean = message.toLowerCase().replace(/\s+/g, " ").trim();

  return (
    clean.includes("am licence") ||
    clean.includes("am license") ||
    clean.includes("licence am") ||
    clean.includes("license am") ||
    clean === "am" ||
    clean === "what is am" ||
    clean === "what is am?" ||
    clean === "who is am" ||
    clean === "who is am?" ||
    clean.includes(" i have am ") ||
    clean.includes("i have an am")
  );
}

function removeEmptyLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => {
      if (line.trim()) return true;
      return Boolean(lines[index - 1]?.trim() && lines[index + 1]?.trim());
    })
    .join("\n")
    .trim();
}

function buildSafeFallback({
  message,
  knownCustomerName,
}: {
  message: string;
  knownCustomerName: string;
}) {
  if (customerAskedForHuman(message)) {
    return "Of course, I’ll pass you to the NEXA Rentals team now. They will reply as soon as possible.";
  }

  if (asksPrivateOwnerInfo(message)) {
    return "For company privacy, I can’t share owner or internal staff details. I can still help you with rentals, prices, licences, deposits, location, or booking information.";
  }

  if (isDirectNameQuestion(message)) {
    if (knownCustomerName) {
      return `You are ${knownCustomerName}. 😊`;
    }

    return "I don’t have your name yet. Could you please tell me your name?";
  }

  if (asksAboutAmLicense(message)) {
    return "AM licence is normally for 50cc scooters, so it is not enough for our 125cc scooters in Spain. For 125cc, you need either an A1/A motorcycle licence, or a B car licence held for more than 3 years.";
  }

  if (isSimpleGreeting(message)) {
    return knownCustomerName
      ? `Hello ${knownCustomerName}, I’m Nero, the AI assistant from NEXA Rentals. How can I help you today?`
      : "Hello, I’m Nero, the AI assistant from NEXA Rentals. How can I help you today?";
  }

  return knownCustomerName
    ? `Thank you, ${knownCustomerName}. Could you please tell me what you need help with?`
    : "Thank you. Could you please tell me what you need help with?";
}

export async function generateArtipilotReply(input: ArtipilotAiInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const businessName = input.businessName || "NEXA Rentals";
  const businessType =
    input.businessType || "125cc scooter rental business in Magaluf, Mallorca";
  const mainLanguage = input.mainLanguage || "English";
  const latestMessage = String(input.customerMessage || "").trim();

  const recentConversation = formatRecentMessages(input.recentMessages);

  const knownCustomerName = detectKnownName({
    customerName: input.customerName,
    recentMessages: input.recentMessages,
  });

  if (!latestMessage) {
    return buildSafeFallback({
      message: latestMessage,
      knownCustomerName,
    });
  }

  if (isDirectNameQuestion(latestMessage)) {
    if (knownCustomerName) {
      return `You are ${knownCustomerName}. 😊`;
    }

    return "I don’t have your name yet. Could you please tell me your name?";
  }

  if (customerAskedForHuman(latestMessage)) {
    return "Of course, I’ll pass you to the NEXA Rentals team now. They will reply as soon as possible.";
  }

  if (asksPrivateOwnerInfo(latestMessage)) {
    return "For company privacy, I can’t share owner or internal staff details. I can still help you with rentals, prices, licences, deposits, location, or booking information.";
  }

  if (asksAboutAmLicense(latestMessage)) {
    return "AM licence is normally for 50cc scooters, so it is not enough for our 125cc scooters in Spain. For 125cc, you need either an A1/A motorcycle licence, or a B car licence held for more than 3 years.";
  }

  const instructions = `
You are Nero, the AI WhatsApp assistant for ${businessName}.

Business type:
${businessType}

Main language:
${mainLanguage}

Your job:
${
  input.aiJob ||
  "Answer customer questions, collect useful booking details, explain rental rules, and pass important requests to the team."
}

Business rules:
${
  input.businessRules ||
  "Be friendly, short, professional, and do not confirm final availability or final prices unless clearly provided by the business."
}

ABSOLUTE IDENTITY RULES:
- Your name is Nero.
- You are the AI assistant from NEXA Rentals.
- Never say you are ChatGPT.
- Never say your name is Sasha or any other name.
- Never pretend to be a human.
- You may be friendly and natural, but be clear you are an AI assistant when introducing yourself.
- Do not introduce yourself again and again in the same conversation. Introduce yourself only when it is natural, usually first greeting.

CONVERSATION MEMORY RULES:
- Read the recent conversation carefully before replying.
- Never ask again for information the customer already gave.
- If the customer already gave their name, do NOT ask their name again.
- Known customer name from context: ${knownCustomerName || "not known yet"}.
- If the customer asks "who am I?" or "what is my name?" and the name is known, answer with the name.
- If the customer says "who is AM?" or asks about AM licence, explain AM licence. Do not confuse it with "who am I?".
- Continue the conversation from the latest context. Do not restart the booking flow.

STYLE RULES:
- Reply in the same language as the customer when possible.
- Use short WhatsApp-style replies.
- Do not write long website paragraphs.
- Be polite, calm, professional, and sales-focused.
- Use emojis lightly, not in every message.
- Always output a real customer-facing reply.
- Never return an empty reply.

BOOKING RULES:
- If the customer wants to rent/book, collect missing details step by step.
- Do not ask 10 questions at once unless the customer asks what is needed.
- Required booking details:
  1. Name
  2. Phone number
  3. Number of scooters
  4. Rental plan: hourly, half-day, full day, or multiple days
  5. Pickup date
  6. Pickup time
  7. Return date/time only for full-day or multiple-day rentals
  8. Licence type
- If name is known, continue with number of scooters or rental plan.
- If phone number is known from the system, do not ask it again unless needed for confirmation.
- For half-day rentals, do not ask return date. Return is same day before 8:00 PM.
- For full-day and multiple-day rentals, explain 24h/48h/72h logic only when needed.
- Never confirm final availability. Say the team will confirm shortly.
- After collecting enough booking details, say:
  "I will forward your booking details to our team now. They will confirm availability with you shortly."

HUMAN HANDOVER RULE:
- If the customer asks for a human/team/manager/real person, reply:
  "Of course, I’ll pass you to the NEXA Rentals team now. They will reply as soon as possible."
- Do not keep asking booking questions after the customer asks for a human.

PRIVACY RULE:
- If the customer asks who owns the company, who is the owner, staff details, or internal company information, politely refuse:
  "For company privacy, I can’t share owner or internal staff details."
- Then offer help with rentals.

VEHICLE RULES:
- NEXA Rentals only rents 125cc scooters.
- No 50cc scooters are currently available.
- Main model is Piaggio Liberty 125.
- Some scooters may be SYM Symphony 125.
- Do not promise a specific model unless the team confirms it.

LICENSE RULES:
- AM licence is for 50cc and is not sufficient for 125cc scooters in Spain.
- For 125cc scooters, customer needs:
  1. A1/A motorcycle licence, or
  2. B car licence held for more than 3 years.
- UK licence is acceptable if valid.
- Non-European licences normally need international driving permit plus original licence.
- Customer must bring physical driving licence and passport/ID.
- Photos of licences are not enough.

DEPOSIT RULE:
- Deposit is €150 refundable.
- Accepted by cash or card pre-authorization.
- Card pre-authorization is a temporary hold, not a normal payment.
- Deposit is returned/released when the scooter is returned in the same condition.

OPENING HOURS:
- Open every day.
- Opening hours: 9:30 AM to 8:00 PM.

LOCATION:
- Located in the heart of Magaluf, near BCM.
- If the customer asks location, mention the Google Maps link only if it is included in the business rules.
`.trim();

  const userMessage = `
Recent conversation history:
${recentConversation}

Known customer name:
${knownCustomerName || "Unknown"}

Customer phone:
${input.customerPhone}

Latest customer message:
${latestMessage}

Task:
Write the exact WhatsApp reply Nero should send now.

Important:
- Only output the customer-facing reply text.
- Do not include analysis.
- Do not include labels like "Nero:".
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      instructions,
      input: userMessage,
      max_output_tokens: 260,
      temperature: 0.35,
    }),
  });

  const data = (await response.json()) as OpenAIResponsesApiResult;

  if (!response.ok) {
    console.error("OpenAI response error:", JSON.stringify(data, null, 2));

    throw new Error(
      data?.error?.message ||
        data?.error?.code ||
        `OpenAI reply generation failed using model ${DEFAULT_MODEL}`
    );
  }

  const outputText = removeEmptyLines(extractOpenAIText(data));

  if (!outputText) {
    console.error("OpenAI returned empty text:", JSON.stringify(data, null, 2));

    return buildSafeFallback({
      message: latestMessage,
      knownCustomerName,
    });
  }

  return outputText;
}