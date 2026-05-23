"use client";

import { useState } from "react";
import {
  canTranslateMessage,
  cx,
  formatTime,
  getMessageOwner,
  isOutbound,
  messageStatus,
} from "@/lib/inbox/helpers";
import type { Message, TranslationResult } from "@/lib/inbox/types";

function StatusTicks({ message }: { message: Message }) {
  if (!isOutbound(message)) return null;
  const status = messageStatus(message);
  if (status === "read") return <span className="ml-0.5 text-[11px] text-[#53BDEB]">✓✓</span>;
  if (status === "delivered") return <span className="ml-0.5 text-[11px] text-[#8696A0]">✓✓</span>;
  if (status === "failed") return <span className="ml-0.5 text-[11px] text-red-500">!</span>;
  return <span className="ml-0.5 text-[11px] text-[#8696A0]">✓</span>;
}

function MessageMedia({ message }: { message: Message }) {
  const url = message.media_url || null;
  const type = String(message.message_type || "").toLowerCase();
  const mime = String(message.media_mime_type || "").toLowerCase();
  const isImage =
    Boolean(url) &&
    (type === "image" || mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(url || ""));
  const isVideo =
    Boolean(url) &&
    (type === "video" || mime.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(url || ""));
  const isAudio =
    Boolean(url) &&
    (type === "audio" || mime.startsWith("audio/") || /\.(ogg|mp3|wav|m4a)$/i.test(url || ""));
  const isDoc =
    Boolean(url) &&
    (type === "document" || mime.includes("pdf") || /\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(url || ""));
  const hasLocation = typeof message.latitude === "number" && typeof message.longitude === "number";

  if (!url && !hasLocation) return null;

  return (
    <div className="mb-1.5 overflow-hidden rounded-xl">
      {isImage && url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={message.media_filename || "Image"} className="max-h-[280px] w-full max-w-[300px] rounded-lg object-cover" />
        </a>
      ) : null}
      {isVideo && url ? <video src={url} controls className="max-h-[280px] w-full max-w-[300px] rounded-lg" /> : null}
      {isAudio && url ? <audio src={url} controls className="w-[240px] max-w-full" /> : null}
      {isDoc && url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-[240px] max-w-full items-center gap-3 rounded-lg bg-black/[0.04] p-3 text-sm font-medium text-[#111B21]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 text-lg">📄</span>
          <span className="min-w-0 flex-1 truncate">{message.media_filename || "Open file"}</span>
        </a>
      ) : null}
      {hasLocation ? (
        <a
          href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-[240px] max-w-full rounded-lg bg-black/[0.04] p-3 text-sm text-[#111B21]"
        >
          <div className="font-semibold">📍 {message.location_name || "Location"}</div>
          {message.location_address ? <div className="mt-1 text-xs text-[#667781]">{message.location_address}</div> : null}
          <div className="mt-2 text-xs font-semibold text-[#008069]">Open in Maps</div>
        </a>
      ) : null}
    </div>
  );
}

type MessageBubbleProps = {
  message: Message;
  translation?: TranslationResult;
  isTranslating?: boolean;
  onTranslate?: () => void;
  onReply?: () => void;
  onCopy?: () => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
};

export default function MessageBubble({
  message,
  translation,
  isTranslating,
  onTranslate,
  onReply,
  onCopy,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const outbound = isOutbound(message);
  const owner = getMessageOwner(message);
  const deleted = message.deleted_for_everyone === true;
  const content = deleted
    ? "This message was deleted."
    : String(message.content || "").trim();
  const hidePlaceholder =
    !deleted &&
    Boolean(message.media_url) &&
    /^\[(Image|Video|Audio message|Document) received\]$/.test(content);

  if (message.role === "system") {
    return (
      <div className="flex justify-center py-1">
        <div className="max-w-[85%] rounded-lg bg-[#FFF4C2] px-3 py-1.5 text-center text-[12px] leading-4 text-[#54656F] shadow-sm">
          {content || "System event"}
        </div>
      </div>
    );
  }

  return (
    <div className={cx("group flex w-full px-1", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "relative max-w-[min(82%,420px)] rounded-lg px-3 py-2 text-[14.2px] leading-[19px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
          outbound
            ? "rounded-tr-none bg-[#D9FDD3] text-[#111B21]"
            : "rounded-tl-none bg-white text-[#111B21]"
        )}
      >
        {owner ? (
          <div
            className={cx(
              "mb-0.5 text-[12px] font-semibold",
              message.role === "assistant" ? "text-[#008069]" : "text-[#8696A0]"
            )}
          >
            {owner}
          </div>
        ) : null}
        <MessageMedia message={message} />
        {message.link_url ? (
          <a href={message.link_url} target="_blank" rel="noopener noreferrer" className="break-all text-[#027EB5] underline">
            {message.link_url}
          </a>
        ) : null}
        {content && !hidePlaceholder ? (
          <p
            className={cx(
              "whitespace-pre-wrap break-words pr-14",
              deleted && "italic text-[#8696A0]"
            )}
          >
            {content}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="absolute right-1 top-1 rounded px-1 text-[#8696A0] opacity-0 transition group-hover:opacity-100"
          aria-label="Message actions"
        >
          ▾
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-7 z-30 min-w-[180px] overflow-hidden rounded-lg border border-[#E9EDEF] bg-white py-1 text-sm shadow-lg">
            {onReply ? (
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#F5F6F6]" onClick={() => { onReply(); setMenuOpen(false); }}>
                Reply
              </button>
            ) : null}
            {onCopy ? (
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#F5F6F6]" onClick={() => { onCopy(); setMenuOpen(false); }}>
                Copy
              </button>
            ) : null}
            {onDeleteForMe ? (
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#F5F6F6]" onClick={() => { onDeleteForMe(); setMenuOpen(false); }}>
                Delete for me
              </button>
            ) : null}
            {onDeleteForEveryone && outbound ? (
              <button type="button" className="block w-full px-3 py-2 text-left text-red-600 hover:bg-[#F5F6F6]" onClick={() => { onDeleteForEveryone(); setMenuOpen(false); }}>
                Delete for everyone
              </button>
            ) : null}
          </div>
        ) : null}
        {!content && !message.media_url ? <p className="pr-14 italic text-[#8696A0]">Empty message</p> : null}
        {translation?.translatedText ? (
          <div className="mt-2 rounded-lg bg-black/[0.04] px-2.5 py-2 text-[12px] text-[#54656F]">
            <div className="mb-1 font-semibold text-[#008069]">
              {translation.detectedLanguage} → {translation.targetLanguage}
            </div>
            <div className="whitespace-pre-wrap">{translation.translatedText}</div>
          </div>
        ) : null}
        {canTranslateMessage(message) && onTranslate ? (
          <button
            type="button"
            onClick={onTranslate}
            className="mt-1 text-[11px] font-semibold text-[#008069] opacity-0 transition-opacity group-hover:opacity-100"
          >
            {isTranslating ? "Translating…" : "Translate"}
          </button>
        ) : null}
        <div className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[11px] leading-none text-[#667781]">
          <span>{formatTime(message.created_at)}</span>
          <StatusTicks message={message} />
        </div>
      </div>
    </div>
  );
}

export function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-lg bg-white/90 px-3 py-1 text-[12px] font-medium text-[#54656F] shadow-sm">
        {label}
      </span>
    </div>
  );
}
