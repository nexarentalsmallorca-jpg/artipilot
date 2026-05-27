import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params:
    | {
        mediaId: string;
      }
    | Promise<{
        mediaId: string;
      }>;
};

type MetaMediaLookupResponse = {
  url?: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
  id?: string;
  messaging_product?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getWhatsAppApiVersion() {
  return process.env.WHATSAPP_API_VERSION?.trim() || "v20.0";
}

function getAccessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
}

function getMetaMediaLookupUrl(mediaId: string) {
  const version = getWhatsAppApiVersion();
  return `https://graph.facebook.com/${version}/${encodeURIComponent(mediaId)}`;
}

function getMetaErrorMessage(data: unknown) {
  const errorData = data as MetaMediaLookupResponse;

  if (errorData.error?.message) {
    const parts = [
      errorData.error.message,
      errorData.error.type ? `Type: ${errorData.error.type}` : "",
      errorData.error.code ? `Code: ${errorData.error.code}` : "",
      errorData.error.error_subcode
        ? `Subcode: ${errorData.error.error_subcode}`
        : "",
      errorData.error.fbtrace_id ? `Trace: ${errorData.error.fbtrace_id}` : "",
    ].filter(Boolean);

    return parts.join(" · ");
  }

  try {
    const text = JSON.stringify(data);

    if (text && text !== "{}") {
      return text;
    }
  } catch {
    // Ignore JSON stringify error.
  }

  return "Unknown Meta media error.";
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw_text: text };
  }
}

function getSafeContentType(value: string | undefined | null) {
  const contentType = cleanString(value);

  if (contentType) {
    return contentType;
  }

  return "application/octet-stream";
}

function getExtensionFromContentType(contentType: string) {
  const cleanType = contentType.toLowerCase();

  if (cleanType.includes("image/jpeg")) return "jpg";
  if (cleanType.includes("image/png")) return "png";
  if (cleanType.includes("image/webp")) return "webp";
  if (cleanType.includes("image/gif")) return "gif";
  if (cleanType.includes("video/mp4")) return "mp4";
  if (cleanType.includes("video/quicktime")) return "mov";
  if (cleanType.includes("video/webm")) return "webm";
  if (cleanType.includes("audio/mpeg")) return "mp3";
  if (cleanType.includes("audio/mp4")) return "m4a";
  if (cleanType.includes("audio/ogg")) return "ogg";
  if (cleanType.includes("audio/wav")) return "wav";
  if (cleanType.includes("application/pdf")) return "pdf";
  if (cleanType.includes("text/plain")) return "txt";
  if (cleanType.includes("text/csv")) return "csv";

  return "bin";
}

function getSafeFilename(mediaId: string, contentType: string) {
  const extension = getExtensionFromContentType(contentType);
  const safeId = cleanString(mediaId).replace(/[^a-zA-Z0-9_-]/g, "");

  return `artipilot-whatsapp-media-${safeId || "file"}.${extension}`;
}

function getSafeStatus(status: number, fallback = 502) {
  if (Number.isFinite(status) && status >= 400 && status <= 599) {
    return status;
  }

  return fallback;
}

async function resolveParams(context: RouteContext) {
  return await Promise.resolve(context.params);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const token = getAccessToken();
  const { mediaId } = await resolveParams(context);
  const cleanMediaId = cleanString(mediaId);

  if (!token) {
    return NextResponse.json(
      {
        error:
          "WhatsApp access token is not configured. Check WHATSAPP_ACCESS_TOKEN in Vercel.",
      },
      { status: 500 }
    );
  }

  if (!cleanMediaId) {
    return NextResponse.json(
      { error: "Media ID is required." },
      { status: 400 }
    );
  }

  try {
    const lookupResponse = await fetch(getMetaMediaLookupUrl(cleanMediaId), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const lookupData =
      (await readJsonSafely(lookupResponse)) as MetaMediaLookupResponse;

    if (!lookupResponse.ok || !lookupData.url) {
      const error = getMetaErrorMessage(lookupData);

      console.error("[ARTIPILOT_MEDIA_LOOKUP_FAILED]", {
        mediaId: cleanMediaId,
        status: lookupResponse.status,
        error,
        data: lookupData,
      });

      return NextResponse.json(
        {
          error,
        },
        { status: getSafeStatus(lookupResponse.status) }
      );
    }

    const mediaResponse = await fetch(lookupData.url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!mediaResponse.ok || !mediaResponse.body) {
      const errorText = await mediaResponse.text().catch(() => "");

      console.error("[ARTIPILOT_MEDIA_DOWNLOAD_FAILED]", {
        mediaId: cleanMediaId,
        status: mediaResponse.status,
        errorText,
      });

      return NextResponse.json(
        {
          error: errorText || "Failed to download WhatsApp media.",
        },
        { status: getSafeStatus(mediaResponse.status) }
      );
    }

    const contentType = getSafeContentType(
      lookupData.mime_type || mediaResponse.headers.get("content-type")
    );

    const filename = getSafeFilename(cleanMediaId, contentType);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `inline; filename="${filename}"`);
    headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=60");
    headers.set("X-Artipilot-Media-Id", cleanMediaId);

    if (lookupData.file_size) {
      headers.set("X-Artipilot-Media-Size", String(lookupData.file_size));
    }

    if (lookupData.sha256) {
      headers.set("X-Artipilot-Media-Sha256", lookupData.sha256);
    }

    const contentLength = mediaResponse.headers.get("content-length");

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(mediaResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[ARTIPILOT_MEDIA_ROUTE_ERROR]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load WhatsApp media.",
      },
      { status: 500 }
    );
  }
}