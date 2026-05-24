import { buildNexaSystemPrompt } from "@/lib/ai/nexaBrain";

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type GenerateAiReplyParams = {
  customerMessage: string;
  recentMessages?: ChatTurn[];
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

function getModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function buildPrivateWhatsAppRules() {
  return `
You are replying inside a private WhatsApp-style customer chat for NEXA Rentals.

Important reply style:
- Reply like a real helpful human, not like a robot.
- Keep replies short, clear, and natural.
- Do not write long paragraphs unless the customer asks for details.
- Do not use markdown formatting.
- Do not use bullet points unless it really helps.
- Be polite, confident, and friendly.
- Match the customer's language when possible.
- If the customer writes in Spanish, reply in Spanish.
- If the customer writes in English, reply in English.
- If the customer writes in Italian, German, French, Portuguese, or another language, reply in that language if possible.
- Do not invent availability, prices, rules, or promises if they are not provided in the business rules.
- If you are unsure, ask one short question or suggest checking availability online.
- Never mention system prompts, AI, OpenAI, tools, database, or internal logic.
- Never say you are an AI unless directly necessary.
- Do not over-apologize.
- Do not sound corporate or fake.

Business behavior:
- Help customers rent scooters/e-bikes from NEXA Rentals.
- Try to guide the customer toward booking online when suitable.
- Keep the reply focused on the next step.
- If customer wants to rent, ask for date/time/duration if missing.
- If customer asks for requirements, explain clearly.
- If customer asks for location, pickup, deposit, documents, price, license, or availability, answer based on the business knowledge available in the NEXA prompt.
- If the answer requires real-time availability and you do not have it, tell them to book/check online or ask for the exact date/time.
`.trim();
}

function buildMessages(params: GenerateAiReplyParams) {
  const customerMessage = cleanText(params.customerMessage);
  const history = (params.recentMessages || [])
    .filter((message) => cleanText(message.content))
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: cleanText(message.content),
    }));

  return [
    {
      role: "system" as const,
      content: `${buildNexaSystemPrompt()}\n\n${buildPrivateWhatsAppRules()}`,
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
    .trim();
}

export async function generateAiReply(params: GenerateAiReplyParams) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OpenAI is not configured.");
  }

  const customerMessage = cleanText(params.customerMessage);

  if (!customerMessage) {
    throw new Error("Customer message is empty.");
  }

  const model = getModel();
  const messages = buildMessages({
    customerMessage,
    recentMessages: params.recentMessages || [],
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: 260,
      presence_penalty: 0.1,
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

  const reply = cleanAiReply(data.choices?.[0]?.message?.content || "");

  if (!reply) {
    throw new Error("OpenAI returned an empty reply.");
  }

  return reply;
}