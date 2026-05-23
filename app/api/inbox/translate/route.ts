import { NextRequest, NextResponse } from "next/server";
import { requirePrivateSession } from "@/lib/auth/requirePrivateSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TranslateRequestBody = {
  text?: string;
  targetLanguage?: string;
};

type DetectResult = {
  detectedLanguage: string;
  translatedText: string;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ar: "Arabic",
  hi: "Hindi",
  pa: "Punjabi",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  pl: "Polish",
  ro: "Romanian",
  uk: "Ukrainian",
};

function normalizeTargetLanguage(language?: string): string {
  const value = String(language || "English").trim().toLowerCase();

  if (value === "es" || value.includes("spanish") || value.includes("español")) {
    return "Spanish";
  }

  if (value === "en" || value.includes("english") || value.includes("inglés")) {
    return "English";
  }

  if (value === "fr" || value.includes("french") || value.includes("français")) {
    return "French";
  }

  if (value === "de" || value.includes("german") || value.includes("deutsch")) {
    return "German";
  }

  if (value === "it" || value.includes("italian") || value.includes("italiano")) {
    return "Italian";
  }

  if (value === "pt" || value.includes("portuguese") || value.includes("português")) {
    return "Portuguese";
  }

  return language?.trim() || "English";
}

function getOpenAiApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null;
}

function safeJsonParse(value: string): DetectResult | null {
  try {
    const parsed = JSON.parse(value);

    if (
      parsed &&
      typeof parsed.detectedLanguage === "string" &&
      typeof parsed.translatedText === "string"
    ) {
      return {
        detectedLanguage: parsed.detectedLanguage,
        translatedText: parsed.translatedText,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const denied = requirePrivateSession(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as TranslateRequestBody;

    const text = String(body.text || "").trim();
    const targetLanguage = normalizeTargetLanguage(body.targetLanguage);

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing text to translate.",
        },
        { status: 400 }
      );
    }

    const openAiApiKey = getOpenAiApiKey();

    if (!openAiApiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_API_KEY is missing in Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a translation engine for a WhatsApp inbox. Detect the customer's original language and translate the message into the target language. Return ONLY valid JSON with this exact shape: {\"detectedLanguage\":\"Language name\",\"translatedText\":\"Translated message\"}. Do not add markdown.",
          },
          {
            role: "user",
            content: JSON.stringify({
              targetLanguage,
              customerMessage: text,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          ok: false,
          error: "Translation request failed.",
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const content =
      data?.choices?.[0]?.message?.content &&
      typeof data.choices[0].message.content === "string"
        ? data.choices[0].message.content.trim()
        : "";

    const parsed = safeJsonParse(content);

    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Translation response was not valid JSON.",
          raw: content,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      detectedLanguage: parsed.detectedLanguage,
      translatedText: parsed.translatedText,
    });
  } catch (error) {
    console.error("Inbox translate API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal translation server error.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Inbox translation API is running.",
    supportedTargets: ["English", "Spanish", "French", "German", "Italian", "Portuguese"],
    knownLanguageCodes: LANGUAGE_NAMES,
  });
}