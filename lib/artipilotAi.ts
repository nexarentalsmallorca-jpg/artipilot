import { buildNexaSystemPrompt } from "@/lib/ai/nexaBrain";

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
  trainingKnowledge?: string;
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

const SAFE_HANDOVER_REPLY =
  "I’ll pass this to the team now so they can confirm it properly. They will reply as soon as possible.";

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
    .slice(-24)
    .map((message) => {
      const speaker =
        message.role === "customer"
          ? "Customer"
          : message.role === "assistant"
            ? "Nero AI"
            : message.role === "manual"
              ? "Human team"
              : "System";

      const direction = message.direction === "inbound" ? "incoming" : "outgoing";
      const time = message.created_at ? ` at ${message.created_at}` : "";

      return `${speaker} (${direction}${time}): ${String(message.content || "").trim()}`;
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

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function isDirectNameQuestion(message: string) {
  const clean = normalizeText(message).replace(/[¿?!.]/g, "");

  return [
    "who am i",
    "who i am",
    "do you know my name",
    "what is my name",
    "tell me my name",
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

export function customerAskedForHuman(message: string) {
  const clean = normalizeText(message);

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
  const clean = normalizeText(message);

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
  const clean = normalizeText(message);

  return (
    clean.includes("am licence") ||
    clean.includes("am license") ||
    clean.includes("licence am") ||
    clean.includes("license am") ||
    clean === "am" ||
    clean === "what is am" ||
    clean === "who is am" ||
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

function cleanAiOutput(text: string) {
  return removeEmptyLines(text)
    .replace(/^nero\s*:\s*/i, "")
    .replace(/^assistant\s*:\s*/i, "")
    .replace(/^reply\s*:\s*/i, "")
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
    return "Of course, I’ll pass you to the team now. They will reply as soon as possible.";
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

export function shouldMarkHumanAttentionFromText(text: string) {
  const clean = normalizeText(text);

  const phrases = [
    "pass you to the team",
    "pass this to the team",
    "team will confirm",
    "team will reply",
    "team can confirm",
    "team to confirm",
    "forward your booking details",
    "forward this to our team",
    "i’ll forward",
    "i will forward",
    "human team",
    "real person",
    "manager",
    "not covered",
    "not sure",
    "i can’t confirm",
    "i cannot confirm",
    "i don’t have enough information",
    "i do not have enough information",
    "please wait for the team",
  ];

  return phrases.some((phrase) => clean.includes(phrase));
}

function hasStrongBusinessBrain(input: ArtipilotAiInput) {
  const combined = `${input.aiJob || ""}\n${input.businessRules || ""}`.trim();
  return combined.length >= 80;
}

function buildInstructions(input: ArtipilotAiInput, knownCustomerName: string) {
  const businessName = input.businessName || "NEXA Rentals";
  const businessType =
    input.businessType || "scooter and e-bike rental business in Magaluf, Mallorca";
  const mainLanguage = input.mainLanguage || "English";

  const aiJob =
    input.aiJob?.trim() ||
    "Answer customer questions, collect useful booking details, explain rental rules, and pass important requests to the team.";

  const businessRules =
    input.businessRules?.trim() ||
    "Be friendly, short, professional, and do not confirm final availability or final prices unless clearly provided by the business.";

  const extraTraining = [
    input.trainingKnowledge?.trim(),
    aiJob ? `Workspace AI job:\n${aiJob}` : "",
    businessRules ? `Workspace business rules:\n${businessRules}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `
${buildNexaSystemPrompt(extraTraining)}

BUSINESS CONTEXT:
Business name: ${businessName}
Business type: ${businessType}
Main business language: ${mainLanguage}
Known customer name: ${knownCustomerName || "not known yet"}

RULE PRIORITY:
1. The AI JOB and BUSINESS RULES above are the highest priority.
2. If the BUSINESS RULES contain a price, licence rule, opening hour, deposit, vehicle type, location, policy, or booking condition, you must follow it exactly.
3. Do not invent a different policy.
4. Do not copy competitor rules from screenshots, links, or customer messages.
5. If the customer says another company allows something, still follow this business's rules only.
6. If the answer is not covered clearly by the AI JOB or BUSINESS RULES, do not guess. Give a helpful safe reply and pass it to the team.

ABSOLUTE IDENTITY RULES:
- Your name is Nero.
- You are the AI assistant from ${businessName}.
- Never say you are ChatGPT.
- Never say your name is Sasha or any other name.
- Never pretend to be a human.
- You may be friendly and natural, but be clear you are an AI assistant when introducing yourself.
- Do not introduce yourself again and again in the same conversation.

CONVERSATION MEMORY RULES:
- Read the recent conversation carefully before replying.
- Continue from the latest context. Do not restart the conversation.
- Never ask again for information the customer already gave.
- If the customer already gave their name, licence type, rental dates, pickup time, quantity, or plan, remember it.
- If the customer asks "who am I?" or "what is my name?" and the name is known, answer with the name.
- If the customer says "who is AM?" or asks about AM licence, explain AM licence. Do not confuse it with "who am I?".

STYLE RULES:
- Reply in the same language as the customer when possible.
- Use short WhatsApp-style replies.
- Sound natural, helpful, and professional, like a smart trained assistant.
- Do not write long website paragraphs.
- Use emojis lightly, not in every message.
- Always output a real customer-facing reply.
- Never return an empty reply.
- Do not include labels like "Nero:" or "Assistant:".

BOOKING RULES:
- If the customer wants to rent/book, collect missing details step by step.
- Do not ask 10 questions at once unless the customer asks what is needed.
- If the phone number is already available from the system, do not ask it again unless the business rule says to confirm it.
- If name is known, do not ask for name again.
- Never confirm final availability unless the business rules explicitly say the AI can confirm it.
- After collecting enough booking details, say you will forward it to the team for confirmation.

HUMAN HANDOVER RULES:
- If the customer asks for a human/team/manager/real person, reply politely that you will pass them to the team.
- If the customer asks something dangerous, legal, licence-sensitive, complaint-related, damage/accident-related, refund-related, police/insurance-related, or not covered by rules, do not deny rudely. Pass it to the team.
- Use phrases like: "${SAFE_HANDOVER_REPLY}"
- Do not keep asking booking questions after the customer asks for a human.

PRIVACY RULE:
- If the customer asks who owns the company, staff details, private numbers, or internal company information, politely refuse and offer help with rentals or booking.

IMPORTANT DEFAULTS ONLY IF NOT CONTRADICTED BY BUSINESS RULES:
- If this is NEXA Rentals, NEXA normally rents 125cc scooters and e-bikes.
- For 125cc scooters in Spain, normally the customer needs A1/A motorcycle licence or B car licence held for more than 3 years.
- AM licence is normally for 50cc and is not enough for 125cc scooters.
- UK provisional licence is not enough for 125cc scooters.
- A valid UK full licence can be acceptable only if it matches the required category/rule.
- If NEXA e-bike prices are not already in business rules: 1 hour €9, 2 hours €16, 3 hours €20, 4 hours €25, 1 day €28, and maximum e-bike rental is 1 day.
- If NEXA e-bike types are not already in business rules: city e-bikes and mountain e-bikes. City e-bike: Moema. Mountain e-bike: Cecotec/Secotec if written in the business rules.
- If business rules contradict any default above, follow the business rules.
`.trim();
}

export async function generateArtipilotReply(input: ArtipilotAiInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

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
    return "Of course, I’ll pass you to the team now. They will reply as soon as possible.";
  }

  if (asksPrivateOwnerInfo(latestMessage)) {
    return "For company privacy, I can’t share owner or internal staff details. I can still help you with rentals, prices, licences, deposits, location, or booking information.";
  }

  if (asksAboutAmLicense(latestMessage)) {
    return "AM licence is normally for 50cc scooters, so it is not enough for our 125cc scooters in Spain. For 125cc, you need either an A1/A motorcycle licence, or a B car licence held for more than 3 years.";
  }

  const instructions = buildInstructions(input, knownCustomerName);

  const userMessage = `
Recent conversation history:
${recentConversation}

Known customer name:
${knownCustomerName || "Unknown"}

Customer phone from WhatsApp:
${input.customerPhone}

Latest customer message:
${latestMessage}

Business brain present:
${hasStrongBusinessBrain(input) ? "YES - follow the AI JOB and BUSINESS RULES strictly." : "NO - use safe defaults and pass unclear cases to team."}

Task:
Write the exact WhatsApp reply Nero should send now.

Output rules:
- Only output the customer-facing reply text.
- Do not include analysis.
- Do not include markdown.
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
      max_output_tokens: 320,
      temperature: 0.25,
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

  const outputText = cleanAiOutput(extractOpenAIText(data));

  if (!outputText) {
    console.error("OpenAI returned empty text:", JSON.stringify(data, null, 2));

    return buildSafeFallback({
      message: latestMessage,
      knownCustomerName,
    });
  }

  return outputText;
}