import { buildNexaSystemPrompt } from "@/lib/ai/nexaBrain";

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function generateAiReply(params: {
  customerMessage: string;
  recentMessages?: ChatTurn[];
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OpenAI is not configured");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const history = params.recentMessages ?? [];

  const messages = [
    { role: "system" as const, content: buildNexaSystemPrompt() },
    ...history,
    { role: "user" as const, content: params.customerMessage },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "OpenAI request failed");
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return data.choices?.[0]?.message?.content?.trim() || "";
}
