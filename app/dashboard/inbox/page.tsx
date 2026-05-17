"use client";

import Image from "next/image";
import Link from "next/link";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import PushNotificationBox from "@/components/dashboard/PushNotificationBox";

type Contact = {
  id: string;
  phone: string;
  name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  ai_enabled: boolean | null;
  created_at: string;

  needs_human_attention?: boolean | null;
  human_attention_reason?: string | null;
  conversation_status?: "open" | "closed" | "snoozed" | "blocked" | string | null;
  assigned_to?: string | null;
  last_ai_summary?: string | null;

  is_blocked?: boolean | null;
  is_muted?: boolean | null;
  muted_until?: string | null;
  is_starred?: boolean | null;
  customer_notes?: string | null;
  profile_image_url?: string | null;

  human_attention?: boolean | null;
  pinned?: boolean | null;
  closed?: boolean | null;
  blocked?: boolean | null;
  customer_photo_url?: string | null;
  profile_note?: string | null;
};

type Message = {
  id: string;
  contact_phone: string;
  whatsapp_message_id: string | null;
  role: "customer" | "assistant" | "manual" | "system";
  direction: "inbound" | "outbound";
  message_type: string | null;
  content: string | null;
  created_at: string;

  delivery_status?: "received" | "sent" | "delivered" | "read" | "failed" | string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  delivery_updated_at?: string | null;
  delivery_error?: unknown;

  media_id?: string | null;
  media_url?: string | null;
  media_mime_type?: string | null;
  media_filename?: string | null;
  media_size?: number | null;
  media_storage_path?: string | null;

  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  location_address?: string | null;

  link_url?: string | null;

  translated_text?: string | null;
  translated_language?: string | null;

  status?: "sent" | "delivered" | "read" | null;
};

type InboxData = {
  contacts?: Contact[];
  messages?: Message[];
  error?: string;
};

type TranslationResult = {
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
};

type ThemeMode = "light" | "dark";
type SortMode = "priority" | "newest" | "unread" | "human" | "pinned" | "closed";
type DateFilter = "all" | "today" | "week" | "month";
type IconName =
  | "home"
  | "whatsapp"
  | "brain"
  | "inbox"
  | "settings"
  | "billing"
  | "sun"
  | "moon"
  | "search"
  | "send"
  | "attachment"
  | "emoji"
  | "dots"
  | "image"
  | "spark"
  | "pin"
  | "bell"
  | "trash"
  | "block"
  | "check"
  | "warning"
  | "profile"
  | "calendar"
  | "filter"
  | "back"
  | "translate"
  | "close";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "home" as IconName },
  { label: "WhatsApp", href: "/dashboard/whatsapp", icon: "whatsapp" as IconName },
  { label: "AI Training", href: "/dashboard/ai-training", icon: "brain" as IconName },
  { label: "Inbox", href: "/dashboard/inbox", icon: "inbox" as IconName },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" as IconName },
  { label: "Billing", href: "/dashboard/billing", icon: "billing" as IconName },
];

const quickEmojis = ["😊", "👍", "🙏", "✅", "📍", "🛵", "🚲", "⏰", "💳", "📄", "🔥", "❤️"];

const attentionKeywords = [
  "team",
  "human",
  "real person",
  "agent",
  "manager",
  "urgent",
  "refund",
  "complaint",
  "incident",
  "accident",
  "problem",
  "issue",
  "help me",
  "talk to someone",
  "pass me",
  "speak to",
  "call me",
  "angry",
  "police",
  "insurance",
  "damage",
  "stolen",
  "flat tire",
  "flat tyre",
  "puncture",
];

const aiHandoffKeywords = [
  "pass this to the team",
  "pass you to the team",
  "pass it to the team",
  "team will confirm",
  "team will reply",
  "team can confirm",
  "team to confirm",
  "i’ll forward",
  "i will forward",
  "forward this to the team",
  "forward your booking details",
  "human team",
  "real person",
  "please wait for the team",
  "i can’t confirm",
  "i cannot confirm",
  "i don’t have enough information",
  "i do not have enough information",
  "not covered",
  "not sure",
];

const mediaPlaceholders = [
  "[Image received]",
  "[Video received]",
  "[Audio message received]",
  "[Document received]",
  "[Sticker received]",
  "[Location received]",
];

const translationLanguages = [
  "English",
  "Spanish",
  "German",
  "French",
  "Italian",
  "Portuguese",
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cleanPhone(phone: string) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function normalizePhoneForCompare(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getInitial(name?: string | null, phone?: string) {
  if (name && name.trim()) return name.trim().charAt(0).toUpperCase();
  if (phone) return phone.slice(-2);
  return "?";
}

function formatTime(dateString?: string | null) {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return "";
  }
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return "";
  }
}

function isInsideDateFilter(dateString: string | null | undefined, filter: DateFilter) {
  if (filter === "all") return true;
  if (!dateString) return false;

  const date = new Date(dateString);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return false;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const startOfMonth = new Date(startOfToday);
  startOfMonth.setMonth(startOfMonth.getMonth() - 1);

  if (filter === "today") return date >= startOfToday;
  if (filter === "week") return date >= startOfWeek;
  if (filter === "month") return date >= startOfMonth;

  return true;
}

function getMessageOwner(message: Message) {
  if (message.role === "assistant") return "Nero AI";
  if (message.role === "manual") return "Manual";
  if (message.role === "system") return "System";
  return "Customer";
}

function getMessageStatus(message: Message) {
  return message.delivery_status || message.status || (message.direction === "outbound" ? "sent" : "received");
}

function messageStatusTicks(message: Message) {
  if (message.direction === "inbound") return null;

  const status = getMessageStatus(message);

  if (status === "read") return <span className="text-[#2187FF]">✓✓</span>;
  if (status === "delivered") return <span>✓✓</span>;
  if (status === "failed") return <span className="text-red-500">!</span>;

  return <span>✓</span>;
}

function getContactPhoto(contact: Contact | null) {
  if (!contact) return null;
  return contact.profile_image_url || contact.customer_photo_url || null;
}

function getContactNote(contact: Contact | null) {
  if (!contact) return "";
  return contact.customer_notes || contact.profile_note || "";
}

function normalizeMessageText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function isMediaMessage(message: Message) {
  const messageType = String(message.message_type || "").toLowerCase();
  const mimeType = String(message.media_mime_type || "").toLowerCase();
  const content = String(message.content || "").trim();

  if (message.media_url || message.media_id || message.media_storage_path) return true;

  if (
    ["image", "video", "audio", "document", "sticker", "location"].includes(messageType)
  ) {
    return true;
  }

  if (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet")
  ) {
    return true;
  }

  return mediaPlaceholders.includes(content);
}

function canTranslateMessage(message: Message) {
  const content = String(message.content || "").trim();
  const messageType = String(message.message_type || "").toLowerCase();

  if (message.direction !== "inbound") return false;
  if (message.role !== "customer") return false;
  if (!content) return false;
  if (messageType && messageType !== "text") return false;
  if (isMediaMessage(message)) return false;
  if (mediaPlaceholders.includes(content)) return false;

  return true;
}

function messageTriggersHumanAttention(message: Message) {
  const content = normalizeMessageText(String(message.content || ""));

  if (!content) return false;

  if (message.role === "system") return true;

  if (message.role === "customer") {
    return attentionKeywords.some((keyword) => content.includes(keyword));
  }

  if (message.role === "assistant") {
    return aiHandoffKeywords.some((keyword) => content.includes(keyword));
  }

  return false;
}

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = `h-4 w-4 ${className}`;

  if (name === "home") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M4 10.6 12 4l8 6.6V20H4v-9.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 20v-5h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "whatsapp") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M5.2 19 6.2 15.5A7.5 7.5 0 1 1 9 18.1L5.2 19Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 8.8c.2-.4.4-.4.6-.4h.5c.2 0 .4.1.5.3l.7 1.5c.1.3.1.5-.2.8l-.4.4c.5.9 1.3 1.7 2.4 2.3l.5-.5c.2-.2.5-.2.7-.1l1.5.7c.3.2.4.4.4.6v.5c0 .5-.4.9-1 1-3.5.3-7.4-3.6-7.2-7.1Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "brain") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M9.5 4.5A3 3 0 0 0 6.5 7.4 3.6 3.6 0 0 0 4.5 13.5 3.2 3.2 0 0 0 9 18h.5V4.5ZM14.5 4.5a3 3 0 0 1 3 2.9 3.6 3.6 0 0 1 2 6.1 3.2 3.2 0 0 1-4.5 4.5h-.5V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "inbox") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M4 13 6.2 6.8A1.5 1.5 0 0 1 7.6 5.8h8.8a1.5 1.5 0 0 1 1.4 1L20 13v5.2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.2V13Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19 12a7.5 7.5 0 0 0-.1-1l2-1.4-2-3.5-2.3 1a7.8 7.8 0 0 0-1.8-1L14.5 3h-5l-.3 3.1a7.8 7.8 0 0 0-1.8 1l-2.3-1-2 3.5 2 1.4a7.5 7.5 0 0 0 0 2l-2 1.4 2 3.5 2.3-1a7.8 7.8 0 0 0 1.8 1l.3 3.1h5l.3-3.1a7.8 7.8 0 0 0 1.8-1l2.3 1 2-3.5-2-1.4c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "billing") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 10h16M7 14h4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "sun") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "moon") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M4 11.5 20 4l-6.5 16-2.3-6.2L4 11.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M20 4 11.2 13.8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "attachment") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M8.5 12.5 14 7a3 3 0 0 1 4.2 4.2l-7.8 7.8a4.5 4.5 0 1 1-6.4-6.4l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "emoji") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 10h.01M15 10h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8.5 14.5c.8 1 2 1.5 3.5 1.5s2.7-.5 3.5-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "dots") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="12" r="1.8" fill="currentColor" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
        <circle cx="18" cy="12" r="1.8" fill="currentColor" />
      </svg>
    );
  }

  if (name === "image") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7 16 3.5-3.5 2.5 2.5 2-2 2 3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="9" cy="9" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "pin") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M14.5 4.5 19.5 9.5l-3 3 .5 4-2 2-4.2-4.2L6 19l-1-1 4.7-4.8L5.5 9l2-2 4 .5 3-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M6.5 17h11l-1.2-1.8V11a4.3 4.3 0 0 0-8.6 0v4.2L6.5 17Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M5 7h14M9 7V5h6v2M8 10v9h8v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "block") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7 17 10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="m5.5 12.5 4 4L18.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M12 4 21 20H3L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5v4M16 3.5v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "back") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "translate") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M4 5h9M8.5 3v2M10.8 5c-.7 3.9-2.7 6.9-6.3 9M6.3 8.8c1.2 2.2 2.9 3.9 5 5.1M14 19l4-9 4 9M15.4 16h5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}

function MessageMedia({
  message,
  isDark,
  mutedTextClass,
}: {
  message: Message;
  isDark: boolean;
  mutedTextClass: string;
}) {
  const mediaUrl = message.media_url || null;
  const mimeType = String(message.media_mime_type || "").toLowerCase();
  const messageType = String(message.message_type || "").toLowerCase();

  const isImage =
    Boolean(mediaUrl) &&
    (messageType === "image" ||
      mimeType.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(mediaUrl || ""));

  const isVideo =
    Boolean(mediaUrl) &&
    (messageType === "video" ||
      mimeType.startsWith("video/") ||
      /\.(mp4|mov|webm)$/i.test(mediaUrl || ""));

  const isAudio =
    Boolean(mediaUrl) &&
    (messageType === "audio" ||
      mimeType.startsWith("audio/") ||
      /\.(ogg|mp3|wav|m4a)$/i.test(mediaUrl || ""));

  const isDocument =
    Boolean(mediaUrl) &&
    (messageType === "document" ||
      mimeType.includes("pdf") ||
      mimeType.includes("word") ||
      mimeType.includes("excel") ||
      mimeType.includes("spreadsheet") ||
      /\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(mediaUrl || ""));

  const hasLocation =
    typeof message.latitude === "number" && typeof message.longitude === "number";

  const mapUrl = hasLocation
    ? `https://www.google.com/maps?q=${message.latitude},${message.longitude}`
    : null;

  return (
    <div className="space-y-2">
      {isImage && mediaUrl ? (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-black/10 bg-black/5">
          <img
            src={mediaUrl}
            alt={message.media_filename || "WhatsApp image"}
            className="max-h-[360px] w-full max-w-[340px] rounded-2xl object-cover"
            loading="lazy"
          />
        </a>
      ) : null}

      {isVideo && mediaUrl ? (
        <video src={mediaUrl} controls className="max-h-[360px] w-full max-w-[360px] rounded-2xl" />
      ) : null}

      {isAudio && mediaUrl ? (
        <audio src={mediaUrl} controls className="w-full max-w-[320px]" />
      ) : null}

      {isDocument && mediaUrl ? (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition",
            isDark
              ? "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]"
              : "border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:bg-white"
          )}
        >
          <Icon name="attachment" />
          <span className="min-w-0 flex-1 truncate">
            {message.media_filename || "Open document"}
          </span>
        </a>
      ) : null}

      {hasLocation && mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(
            "block rounded-2xl border px-4 py-3 text-sm font-bold transition",
            isDark
              ? "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]"
              : "border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:bg-white"
          )}
        >
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="font-black">
              {message.location_name || "Location received"}
            </span>
          </div>

          {message.location_address ? (
            <p className={cx("mt-1 text-xs", mutedTextClass)}>
              {message.location_address}
            </p>
          ) : null}

          <p className="mt-2 text-xs font-black text-[#079566]">
            Open in Google Maps
          </p>
        </a>
      ) : null}
    </div>
  );
}

function TranslationBox({
  translation,
  isDark,
}: {
  translation?: TranslationResult;
  isDark: boolean;
}) {
  if (!translation?.translatedText) return null;

  return (
    <div
      className={cx(
        "mt-3 rounded-2xl border px-3 py-2 text-xs",
        isDark
          ? "border-[#1F2937] bg-black/20 text-[#CBD5E1]"
          : "border-[#DCE6F0] bg-[#F8FAFC] text-[#475569]"
      )}
    >
      <div className="flex items-center gap-2 font-black">
        <Icon name="translate" className="h-3.5 w-3.5" />
        <span>
          {translation.detectedLanguage || "Detected language"} →{" "}
          {translation.targetLanguage || "English"}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap leading-5">
        {translation.translatedText}
      </p>
    </div>
  );
}

function MessageBody({
  message,
  isDark,
  mutedTextClass,
  translation,
}: {
  message: Message;
  isDark: boolean;
  mutedTextClass: string;
  translation?: TranslationResult;
}) {
  const content = String(message.content || "").trim();
  const mediaUrl = message.media_url || null;
  const messageType = String(message.message_type || "").toLowerCase();

  const onlyPlaceholderImage =
    content === "[Image received]" && Boolean(mediaUrl);

  const onlyPlaceholderVideo =
    content === "[Video received]" && Boolean(mediaUrl);

  const onlyPlaceholderAudio =
    content === "[Audio message received]" && Boolean(mediaUrl);

  const onlyPlaceholderDocument =
    content === "[Document received]" && Boolean(mediaUrl);

  const shouldHidePlaceholder =
    onlyPlaceholderImage ||
    onlyPlaceholderVideo ||
    onlyPlaceholderAudio ||
    onlyPlaceholderDocument;

  const showTranslationBox = canTranslateMessage(message);

  return (
    <div className="space-y-2">
      <MessageMedia
        message={message}
        isDark={isDark}
        mutedTextClass={mutedTextClass}
      />

      {message.link_url ? (
        <a
          href={message.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-sm font-bold text-[#2187FF] underline"
        >
          {message.link_url}
        </a>
      ) : null}

      {content && !shouldHidePlaceholder ? (
        <p className="whitespace-pre-wrap break-words">{content}</p>
      ) : null}

      {!content && !mediaUrl && messageType !== "location" ? (
        <p className="whitespace-pre-wrap break-words">[Empty message]</p>
      ) : null}

      {showTranslationBox ? (
        <TranslationBox translation={translation} isDark={isDark} />
      ) : null}
    </div>
  );
}
function ContactAvatar({
  contact,
  size = 44,
}: {
  contact: Contact | null;
  size?: number;
}) {
  const photo = getContactPhoto(contact);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#22D3EE] to-[#34E7A9] text-sm font-black text-[#05201A]"
      style={{ height: size, width: size }}
    >
      {photo && contact ? (
        <Image
          src={photo}
          alt={contact.name || contact.phone}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {getInitial(contact?.name, contact?.phone)}
        </div>
      )}

      {contact ? (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#22C55E]" />
      ) : null}
    </div>
  );
}

function MobileBottomNav({ isDark }: { isDark: boolean }) {
  return (
    <nav
      className={cx(
        "fixed bottom-3 left-3 right-3 z-40 rounded-[1.6rem] border p-2 shadow-[0_18px_70px_rgba(0,0,0,0.20)] backdrop-blur-2xl md:hidden",
        isDark ? "border-white/10 bg-[#101722]/95" : "border-[#E2E8F0] bg-white/95"
      )}
    >
      <div className="grid grid-cols-5 gap-1">
        {[
          ["Home", "/dashboard", "home"],
          ["WhatsApp", "/dashboard/whatsapp", "whatsapp"],
          ["Training", "/dashboard/ai-training", "brain"],
          ["Inbox", "/dashboard/inbox", "inbox"],
          ["Settings", "/dashboard/settings", "settings"],
        ].map(([label, href, icon]) => (
          <Link
            key={label}
            href={href}
            className={cx(
              "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-black",
              label === "Inbox"
                ? isDark
                  ? "bg-[#163126] text-[#55E6B5]"
                  : "bg-[#E7F8F0] text-[#079566]"
                : isDark
                  ? "text-[#94A3B8]"
                  : "text-[#64748B]"
            )}
          >
            <Icon name={icon as IconName} className="h-5 w-5" />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function InboxPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [theme, setTheme] = useState<ThemeMode>("light");
  const [navExpanded, setNavExpanded] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [loading, setLoading] = useState(true);

  const [manualReply, setManualReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loadError, setLoadError] = useState("");

  const [localAiEnabled, setLocalAiEnabled] = useState(true);
  const [aiToggleSaving, setAiToggleSaving] = useState(false);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [localActionNotice, setLocalActionNotice] = useState("");

  const [translationTarget, setTranslationTarget] = useState("English");
  const [translations, setTranslations] = useState<Record<string, TranslationResult>>({});
  const [translatingMap, setTranslatingMap] = useState<Record<string, boolean>>({});

  const [localPinnedMap, setLocalPinnedMap] = useState<Record<string, boolean>>({});
  const [localClosedMap, setLocalClosedMap] = useState<Record<string, boolean>>({});
  const [localBlockedMap, setLocalBlockedMap] = useState<Record<string, boolean>>({});
  const [localMutedMap, setLocalMutedMap] = useState<Record<string, string | null>>({});
  const [localHandledHumanMap, setLocalHandledHumanMap] = useState<Record<string, string>>({});

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedPhoneRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === "dark";

  const pageClass = isDark
    ? "bg-[#0B0F17] text-[#F8FAFC]"
    : "bg-[#F6F8FB] text-[#0F172A]";

  const panelClass = isDark
    ? "border-[#1F2937] bg-[#101722]"
    : "border-[#E2E8F0] bg-white";

  const softPanelClass = isDark
    ? "border-[#1F2937] bg-[#0D131D]"
    : "border-[#E2E8F0] bg-[#F8FAFC]";

  const mutedTextClass = isDark ? "text-[#94A3B8]" : "text-[#64748B]";

  useEffect(() => {
    const savedTheme = localStorage.getItem("artipilot_theme");
    const savedPinned = localStorage.getItem("artipilot_inbox_pinned_map");
    const savedClosed = localStorage.getItem("artipilot_inbox_closed_map");
    const savedBlocked = localStorage.getItem("artipilot_inbox_blocked_map");
    const savedMuted = localStorage.getItem("artipilot_inbox_muted_map");
    const savedHandled = localStorage.getItem("artipilot_inbox_human_handled_map");
    const savedTarget = localStorage.getItem("artipilot_translation_target");

    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedTarget) setTranslationTarget(savedTarget);

    try {
      if (savedPinned) setLocalPinnedMap(JSON.parse(savedPinned));
      if (savedClosed) setLocalClosedMap(JSON.parse(savedClosed));
      if (savedBlocked) setLocalBlockedMap(JSON.parse(savedBlocked));
      if (savedMuted) setLocalMutedMap(JSON.parse(savedMuted));
      if (savedHandled) setLocalHandledHumanMap(JSON.parse(savedHandled));
    } catch {
      console.error("Could not read saved inbox settings.");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("artipilot_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("artipilot_translation_target", translationTarget);
  }, [translationTarget]);

  useEffect(() => {
    localStorage.setItem("artipilot_inbox_pinned_map", JSON.stringify(localPinnedMap));
  }, [localPinnedMap]);

  useEffect(() => {
    localStorage.setItem("artipilot_inbox_closed_map", JSON.stringify(localClosedMap));
  }, [localClosedMap]);

  useEffect(() => {
    localStorage.setItem("artipilot_inbox_blocked_map", JSON.stringify(localBlockedMap));
  }, [localBlockedMap]);

  useEffect(() => {
    localStorage.setItem("artipilot_inbox_muted_map", JSON.stringify(localMutedMap));
  }, [localMutedMap]);

  useEffect(() => {
    localStorage.setItem("artipilot_inbox_human_handled_map", JSON.stringify(localHandledHumanMap));
  }, [localHandledHumanMap]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setUserEmail(session?.user?.email || null);

    const avatar =
      session?.user?.user_metadata?.avatar_url ||
      session?.user?.user_metadata?.picture ||
      null;

    setUserAvatarUrl(avatar);

    const token = session?.access_token;
    if (!token) return {};

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const inferredHumanPhones = useMemo(() => {
    const phones = new Set<string>();

    for (const contact of contacts) {
      if (contact.needs_human_attention || contact.human_attention) {
        phones.add(contact.phone);
      }
    }

    for (const message of messages) {
      if (messageTriggersHumanAttention(message)) {
        phones.add(message.contact_phone);
      }
    }

    return phones;
  }, [contacts, messages]);

  const contactByPhone = useMemo(() => {
    const map = new Map<string, Contact>();
    for (const contact of contacts) map.set(contact.phone, contact);
    return map;
  }, [contacts]);

  const selectedContact = useMemo(() => {
    return selectedPhone ? contactByPhone.get(selectedPhone) || null : null;
  }, [contactByPhone, selectedPhone]);

  const selectedMessages = useMemo(() => {
    if (!selectedPhone) return [];

    return messages
      .filter((message) => message.contact_phone === selectedPhone)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [messages, selectedPhone]);

  const latestMessageAtByPhone = useMemo(() => {
    const map = new Map<string, string>();

    for (const message of messages) {
      const current = map.get(message.contact_phone);
      const currentTime = current ? new Date(current).getTime() : 0;
      const nextTime = new Date(message.created_at).getTime();

      if (!current || nextTime > currentTime) {
        map.set(message.contact_phone, message.created_at);
      }
    }

    return map;
  }, [messages]);

  const needsHumanAttention = useCallback(
    (contact: Contact) => {
      const handledValue = localHandledHumanMap[contact.phone];

      if (handledValue) {
        const latestMessageAt = latestMessageAtByPhone.get(contact.phone);
        const handledTime = Number(handledValue);

        if (latestMessageAt && Number.isFinite(handledTime)) {
          const latestTime = new Date(latestMessageAt).getTime();

          if (Number.isFinite(latestTime) && latestTime <= handledTime) {
            return false;
          }
        } else {
          return false;
        }
      }

      return (
        contact.needs_human_attention === true ||
        contact.human_attention === true ||
        inferredHumanPhones.has(contact.phone)
      );
    },
    [inferredHumanPhones, localHandledHumanMap, latestMessageAtByPhone]
  );

  const isPinned = useCallback(
    (contact: Contact) =>
      contact.is_starred === true ||
      contact.pinned === true ||
      Boolean(localPinnedMap[contact.phone]),
    [localPinnedMap]
  );

  const isClosed = useCallback(
    (contact: Contact) =>
      contact.conversation_status === "closed" ||
      contact.closed === true ||
      Boolean(localClosedMap[contact.phone]),
    [localClosedMap]
  );

  const isBlocked = useCallback(
    (contact: Contact) =>
      contact.conversation_status === "blocked" ||
      contact.is_blocked === true ||
      contact.blocked === true ||
      Boolean(localBlockedMap[contact.phone]),
    [localBlockedMap]
  );

  const isMuted = useCallback(
    (contact: Contact) => {
      const localMuted = localMutedMap[contact.phone];
      const dbMuted = contact.muted_until;
      const mutedUntil = localMuted || dbMuted;

      if (!mutedUntil) return false;

      const mutedUntilTime = new Date(mutedUntil).getTime();

      return Number.isFinite(mutedUntilTime) && mutedUntilTime > Date.now();
    },
    [localMutedMap]
  );

  const totalUnread = useMemo(() => {
    return contacts.reduce(
      (total, contact) => total + Number(contact.unread_count || 0),
      0
    );
  }, [contacts]);

  const humanCount = useMemo(() => {
    return contacts.filter((contact) => needsHumanAttention(contact)).length;
  }, [contacts, needsHumanAttention]);

  const filteredContacts = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    const filtered = contacts.filter((contact) => {
      const unread = Number(contact.unread_count || 0);
      const human = needsHumanAttention(contact);
      const pinned = isPinned(contact);
      const closed = isClosed(contact);

      const searchOk =
        !search ||
        String(contact.name || "").toLowerCase().includes(search) ||
        String(contact.phone || "").toLowerCase().includes(search) ||
        String(contact.last_message || "").toLowerCase().includes(search);

      const dateOk = isInsideDateFilter(contact.last_message_at, dateFilter);

      const sortFilterOk =
        sortMode === "priority" ||
        sortMode === "newest" ||
        (sortMode === "unread" && unread > 0) ||
        (sortMode === "human" && human) ||
        (sortMode === "pinned" && pinned) ||
        (sortMode === "closed" && closed);

      return searchOk && dateOk && sortFilterOk;
    });

    return filtered.sort((a, b) => {
      const aHuman = needsHumanAttention(a) ? 1 : 0;
      const bHuman = needsHumanAttention(b) ? 1 : 0;

      const aPinned = isPinned(a) ? 1 : 0;
      const bPinned = isPinned(b) ? 1 : 0;

      const aUnread = Number(a.unread_count || 0) > 0 ? 1 : 0;
      const bUnread = Number(b.unread_count || 0) > 0 ? 1 : 0;

      const aClosed = isClosed(a) ? 1 : 0;
      const bClosed = isClosed(b) ? 1 : 0;

      const aBlocked = isBlocked(a) ? 1 : 0;
      const bBlocked = isBlocked(b) ? 1 : 0;

      const aTime = new Date(a.last_message_at || a.created_at).getTime();
      const bTime = new Date(b.last_message_at || b.created_at).getTime();

      if (sortMode === "priority" || sortMode === "newest") {
        if (aBlocked !== bBlocked) return aBlocked - bBlocked;
        if (aClosed !== bClosed) return aClosed - bClosed;
        if (aHuman !== bHuman) return bHuman - aHuman;
        if (aPinned !== bPinned) return bPinned - aPinned;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return bTime - aTime;
      }

      if (sortMode === "human") {
        if (aHuman !== bHuman) return bHuman - aHuman;
        return bTime - aTime;
      }

      if (sortMode === "unread") {
        if (aUnread !== bUnread) return bUnread - aUnread;
        return bTime - aTime;
      }

      if (sortMode === "pinned") {
        if (aPinned !== bPinned) return bPinned - aPinned;
        return bTime - aTime;
      }

      return bTime - aTime;
    });
  }, [
    contacts,
    searchValue,
    sortMode,
    dateFilter,
    needsHumanAttention,
    isPinned,
    isClosed,
    isBlocked,
  ]);

  const loadInbox = useCallback(
    async (silent = false) => {
      try {
        setLoadError("");

        const authHeaders = await getAuthHeaders();

        const res = await fetch("/api/inbox", {
          cache: "no-store",
          headers: authHeaders,
        });

        const data: InboxData = await res.json();

        if (!res.ok) {
          setLoadError(data?.error || "Failed to load inbox.");
          return;
        }

        const nextContacts = data.contacts || [];
        const nextMessages = data.messages || [];

        setContacts(nextContacts);
        setMessages(nextMessages);

        const currentSelectedPhone = selectedPhoneRef.current;

        if (!currentSelectedPhone && nextContacts?.[0]?.phone) {
          const sortedFirst = [...nextContacts].sort((a, b) => {
            const aHuman = a.needs_human_attention || a.human_attention ? 1 : 0;
            const bHuman = b.needs_human_attention || b.human_attention ? 1 : 0;
            const aUnread = Number(a.unread_count || 0) > 0 ? 1 : 0;
            const bUnread = Number(b.unread_count || 0) > 0 ? 1 : 0;
            const aTime = new Date(a.last_message_at || a.created_at).getTime();
            const bTime = new Date(b.last_message_at || b.created_at).getTime();

            if (aHuman !== bHuman) return bHuman - aHuman;
            if (aUnread !== bUnread) return bUnread - aUnread;
            return bTime - aTime;
          })[0];

          setSelectedPhone(sortedFirst.phone);
          selectedPhoneRef.current = sortedFirst.phone;
        }

        if (
          currentSelectedPhone &&
          !nextContacts.some((contact) => contact.phone === currentSelectedPhone)
        ) {
          const nextPhone = nextContacts?.[0]?.phone || null;
          setSelectedPhone(nextPhone);
          selectedPhoneRef.current = nextPhone;
        }
      } catch (error) {
        console.error("Failed to load inbox:", error);
        setLoadError("Could not load inbox. Check /api/inbox and Supabase.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  async function translateMessage(message: Message, force = false) {
    const content = String(message.content || "").trim();

    if (!canTranslateMessage(message)) return;

    const key = `${message.id}:${translationTarget}`;

    if (!force && translations[key]) return;
    if (translatingMap[key]) return;

    try {
      setTranslatingMap((previous) => ({ ...previous, [key]: true }));

      const authHeaders = await getAuthHeaders();

      const res = await fetch("/api/inbox/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          messageId: message.id,
          text: content,
          targetLanguage: translationTarget,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.translatedText) {
        return;
      }

      setTranslations((previous) => ({
        ...previous,
        [key]: {
          translatedText: String(data.translatedText || ""),
          detectedLanguage: String(data.detectedLanguage || "Unknown language"),
          targetLanguage: String(data.targetLanguage || translationTarget),
        },
      }));
    } catch (error) {
      console.error("Translate message error:", error);
    } finally {
      setTranslatingMap((previous) => ({ ...previous, [key]: false }));
    }
  }

  useEffect(() => {
    for (const message of selectedMessages) {
      if (canTranslateMessage(message)) {
        void translateMessage(message);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMessages.length, selectedPhone, translationTarget]);

  const markChatAsRead = useCallback(
    async (phone: string) => {
      try {
        const authHeaders = await getAuthHeaders();

        setContacts((previous) =>
          previous.map((contact) =>
            normalizePhoneForCompare(contact.phone) === normalizePhoneForCompare(phone)
              ? { ...contact, unread_count: 0 }
              : contact
          )
        );

        await fetch("/api/inbox/mark-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ phone: cleanPhone(phone) }),
        });
      } catch (error) {
        console.error("Mark read error:", error);
      }
    },
    [getAuthHeaders]
  );

  async function selectChat(contact: Contact, openMobile = false) {
    setSelectedPhone(contact.phone);
    selectedPhoneRef.current = contact.phone;
    setLocalAiEnabled(contact.ai_enabled !== false);
    setSendError("");
    setEmojiOpen(false);
    setMoreMenuOpen(false);
    setReportOpen(false);

    if (openMobile) setMobileChatOpen(true);

    if (Number(contact.unread_count || 0) > 0) {
      await markChatAsRead(contact.phone);
    }
  }

  function handleTyping(value: string) {
    setManualReply(value);
    setSendError("");
    isTypingRef.current = true;

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
    }, 1500);
  }

  async function updateContactForPhone(phone: string, payload: Record<string, unknown>) {
    try {
      const authHeaders = await getAuthHeaders();

      const res = await fetch("/api/inbox/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          phone: cleanPhone(phone),
          ...payload,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Contact update error:", data);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Contact update error:", error);
      return false;
    }
  }

  async function sendManualReply() {
    if (!selectedContact) {
      setSendError("Please select a chat first.");
      return;
    }

    if (isBlocked(selectedContact)) {
      setSendError("This contact is blocked. Unblock the contact before sending.");
      return;
    }

    if (!manualReply.trim()) {
      setSendError("Please type a message before sending.");
      return;
    }

    try {
      setSending(true);
      setSendError("");

      const cleanMessage = manualReply.trim();
      const authHeaders = await getAuthHeaders();
      const now = new Date().toISOString();

      const optimisticMessage: Message = {
        id: `local-${Date.now()}`,
        contact_phone: selectedContact.phone,
        whatsapp_message_id: null,
        role: "manual",
        direction: "outbound",
        message_type: "text",
        content: cleanMessage,
        created_at: now,
        delivery_status: "sent",
      };

      setMessages((previous) => [...previous, optimisticMessage]);

      setContacts((previous) =>
        previous.map((contact) =>
          contact.phone === selectedContact.phone
            ? {
                ...contact,
                last_message: cleanMessage,
                last_message_at: now,
              }
            : contact
        )
      );

      setManualReply("");
      isTypingRef.current = false;

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          to: cleanPhone(selectedContact.phone),
          message: cleanMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Send reply error:", data);
        setSendError(data?.error || "Failed to send message.");
        return;
      }

      await loadInbox(true);
    } catch (error) {
      console.error("Manual reply error:", error);
      setSendError("Something went wrong while sending.");
    } finally {
      setSending(false);
    }
  }

  async function updateAiEnabled(nextValue: boolean) {
    if (!selectedContact) return;

    try {
      setAiToggleSaving(true);
      setSendError("");
      setLocalAiEnabled(nextValue);

      setContacts((previous) =>
        previous.map((contact) =>
          contact.phone === selectedContact.phone
            ? { ...contact, ai_enabled: nextValue }
            : contact
        )
      );

      const ok = await updateContactForPhone(selectedContact.phone, {
        ai_enabled: nextValue,
      });

      if (!ok) {
        setSendError("Could not save AI status. Check /api/inbox/contact.");
      }
    } finally {
      setAiToggleSaving(false);
    }
  }

  function togglePinned(contact: Contact) {
    const nextValue = !isPinned(contact);

    setLocalPinnedMap((previous) => ({
      ...previous,
      [contact.phone]: nextValue,
    }));

    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone
          ? { ...item, is_starred: nextValue, pinned: nextValue }
          : item
      )
    );

    void updateContactForPhone(contact.phone, {
      is_starred: nextValue,
      pinned: nextValue,
    });
  }

  function setClosed(contact: Contact, nextValue: boolean) {
    setLocalClosedMap((previous) => ({
      ...previous,
      [contact.phone]: nextValue,
    }));

    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone
          ? {
              ...item,
              conversation_status: nextValue ? "closed" : "open",
              closed: nextValue,
              needs_human_attention: nextValue ? false : item.needs_human_attention,
              human_attention: nextValue ? false : item.human_attention,
            }
          : item
      )
    );

    void updateContactForPhone(contact.phone, {
      conversation_status: nextValue ? "closed" : "open",
      closed: nextValue,
      needs_human_attention: nextValue ? false : undefined,
    });
  }

  function setBlocked(contact: Contact, nextValue: boolean) {
    setLocalBlockedMap((previous) => ({
      ...previous,
      [contact.phone]: nextValue,
    }));

    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone
          ? {
              ...item,
              is_blocked: nextValue,
              blocked: nextValue,
              conversation_status: nextValue ? "blocked" : "open",
              ai_enabled: nextValue ? false : item.ai_enabled,
            }
          : item
      )
    );

    void updateContactForPhone(contact.phone, {
      is_blocked: nextValue,
      blocked: nextValue,
      conversation_status: nextValue ? "blocked" : "open",
      ai_enabled: nextValue ? false : undefined,
    });

    setLocalActionNotice(nextValue ? "Contact blocked." : "Contact unblocked.");
    setMoreMenuOpen(false);
  }

  function muteContact(contact: Contact, hours: number) {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    setLocalMutedMap((previous) => ({
      ...previous,
      [contact.phone]: until,
    }));

    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone
          ? {
              ...item,
              is_muted: true,
              muted_until: until,
            }
          : item
      )
    );

    void updateContactForPhone(contact.phone, {
      is_muted: true,
      muted_until: until,
    });

    setLocalActionNotice(`Notifications muted for ${hours} hour${hours === 1 ? "" : "s"}.`);
    setMoreMenuOpen(false);
  }

  function unmuteContact(contact: Contact) {
    setLocalMutedMap((previous) => ({
      ...previous,
      [contact.phone]: null,
    }));

    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone
          ? {
              ...item,
              is_muted: false,
              muted_until: null,
            }
          : item
      )
    );

    void updateContactForPhone(contact.phone, {
      is_muted: false,
      muted_until: null,
    });

    setLocalActionNotice("Notifications unmuted.");
    setMoreMenuOpen(false);
  }

  async function deleteSelectedChat() {
    if (!selectedContact) return;

    const confirmed = window.confirm(
      `Delete chat with ${selectedContact.name || selectedContact.phone}?`
    );

    if (!confirmed) return;

    try {
      const authHeaders = await getAuthHeaders();

      const res = await fetch("/api/inbox/delete-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ phone: cleanPhone(selectedContact.phone) }),
      });

      if (!res.ok) {
        setLocalActionNotice("Delete API is not ready yet. The chat was hidden locally.");
      }

      setContacts((previous) =>
        previous.filter((contact) => contact.phone !== selectedContact.phone)
      );
      setMessages((previous) =>
        previous.filter((message) => message.contact_phone !== selectedContact.phone)
      );
      setSelectedPhone(null);
      selectedPhoneRef.current = null;
      setMobileChatOpen(false);
      setMoreMenuOpen(false);
    } catch {
      setLocalActionNotice("Delete API is not ready yet. The chat was hidden locally.");
      setContacts((previous) =>
        previous.filter((contact) => contact.phone !== selectedContact.phone)
      );
      setMessages((previous) =>
        previous.filter((message) => message.contact_phone !== selectedContact.phone)
      );
      setSelectedPhone(null);
      selectedPhoneRef.current = null;
      setMobileChatOpen(false);
      setMoreMenuOpen(false);
    }
  }

  async function generateAiSuggestion() {
    if (!selectedContact) {
      setSendError("Select a chat first.");
      return;
    }

    try {
      setSendError("");
      setLocalActionNotice("Generating AI suggestion...");

      const authHeaders = await getAuthHeaders();

      const res = await fetch("/api/inbox/ai-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          phone: cleanPhone(selectedContact.phone),
          latestMessage: selectedContact.last_message || "",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.suggestion) {
        const fallback = selectedContact.last_message
          ? "Thank you for your message. I’ll check this and get back to you shortly."
          : "Hello, thank you for contacting us. How can I help you today?";

        setManualReply(fallback);
        setLocalActionNotice("AI suggestion API is not ready yet, so I added a safe draft reply.");
        return;
      }

      setManualReply(String(data.suggestion));
      setLocalActionNotice("AI suggestion added to the message box.");
    } catch {
      setManualReply("Thank you for your message. I’ll check this and get back to you shortly.");
      setLocalActionNotice("AI suggestion API is not ready yet, so I added a safe draft reply.");
    }
  }

  function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLocalActionNotice(
      `Selected document: ${file.name}. Media sending API will be connected in the next backend step.`
    );

    event.target.value = "";
  }

  function handleMediaUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLocalActionNotice(
      `Selected media: ${file.name}. Media sending API will be connected in the next backend step.`
    );

    event.target.value = "";
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendManualReply();
    }
  }

  function markHumanHandled(contact: Contact) {
    setLocalHandledHumanMap((previous) => ({
      ...previous,
      [contact.phone]: String(Date.now()),
    }));

    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone
          ? {
              ...item,
              needs_human_attention: false,
              human_attention: false,
              human_attention_reason: null,
            }
          : item
      )
    );

    void updateContactForPhone(contact.phone, {
      needs_human_attention: false,
      human_attention: false,
      human_attention_reason: null,
    });

    setLocalActionNotice("Human alert marked as handled.");
  }

  useEffect(() => {
    void loadInbox(false);

    const interval = window.setInterval(() => {
      if (!sending && !isTypingRef.current) {
        void loadInbox(true);
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [loadInbox, sending]);

  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  useEffect(() => {
    if (selectedContact) {
      setLocalAiEnabled(selectedContact.ai_enabled !== false);
    }
  }, [selectedContact?.phone, selectedContact?.ai_enabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages.length, selectedPhone]);

  const selectedHumanAttention = selectedContact ? needsHumanAttention(selectedContact) : false;
  const selectedBlocked = selectedContact ? isBlocked(selectedContact) : false;
  const selectedMuted = selectedContact ? isMuted(selectedContact) : false;
  const selectedPinned = selectedContact ? isPinned(selectedContact) : false;
  const selectedClosed = selectedContact ? isClosed(selectedContact) : false;

  function renderContactCard(contact: Contact, mobile = false) {
    const unread = Number(contact.unread_count || 0);
    const selected = selectedPhone === contact.phone;
    const human = needsHumanAttention(contact);
    const pinned = isPinned(contact);
    const closed = isClosed(contact);
    const blocked = isBlocked(contact);
    const muted = isMuted(contact);

    return (
      <button
        key={contact.id || contact.phone}
        type="button"
        onClick={() => selectChat(contact, mobile)}
        className={cx(
          "mb-2 w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]",
          selected
            ? isDark
              ? "border-[#2DD4A8] bg-[#0F2A23]"
              : "border-[#A8EACF] bg-[#ECFBF3]"
            : human
              ? isDark
                ? "border-red-500/60 bg-red-950/30 shadow-[0_0_0_1px_rgba(239,68,68,0.12)] hover:bg-red-950/40"
                : "border-red-300 bg-red-50 shadow-[0_0_0_1px_rgba(239,68,68,0.08)] hover:bg-red-100/70"
              : unread > 0
                ? isDark
                  ? "border-[#22D3EE]/25 bg-[#0A1B28] hover:bg-[#0D2434]"
                  : "border-[#D7EAF8] bg-[#F8FCFF] hover:bg-[#EFF8FF]"
                : isDark
                  ? "border-[#1F2937] bg-[#0B111C] hover:bg-[#111827]"
                  : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
        )}
      >
        {human ? (
          <div
            className={cx(
              "mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black",
              isDark ? "bg-red-500/15 text-red-200" : "bg-red-100 text-red-700"
            )}
          >
            <Icon name="warning" className="h-3.5 w-3.5" />
            <span className="truncate">Human attention needed</span>
          </div>
        ) : null}

        <div className="flex gap-3">
          <ContactAvatar contact={contact} size={mobile ? 48 : 44} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-black">
                {contact.name || contact.phone}
              </p>

              {pinned ? <Icon name="pin" className="shrink-0 text-[#F59E0B]" /> : null}
              {muted ? <Icon name="bell" className="shrink-0 text-[#94A3B8]" /> : null}

              <span className={cx("ml-auto shrink-0 text-xs", mutedTextClass)}>
                {formatTime(contact.last_message_at)}
              </span>
            </div>

            <p
              className={cx(
                "mt-1 truncate text-sm",
                human
                  ? isDark
                    ? "font-black text-red-100"
                    : "font-black text-red-800"
                  : unread > 0
                    ? isDark
                      ? "font-bold text-white"
                      : "font-bold text-[#0F172A]"
                    : mutedTextClass
              )}
            >
              {contact.last_message || "No message"}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <p className={cx("min-w-0 flex-1 truncate text-xs", mutedTextClass)}>
                {contact.phone}
              </p>

              {unread > 0 ? (
                <span className="rounded-full bg-[#22D3EE] px-2 py-0.5 text-[10px] font-black text-[#05202A]">
                  {unread}
                </span>
              ) : null}

              {human ? (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                  Human
                </span>
              ) : null}

              {blocked ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                  Blocked
                </span>
              ) : closed ? (
                <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-black", isDark ? "bg-white/10 text-[#CBD5E1]" : "bg-[#E2E8F0] text-[#475569]")}>
                  Closed
                </span>
              ) : (
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5 text-[10px] font-black",
                    contact.ai_enabled === false
                      ? "bg-[#FFF4E5] text-[#B76A00]"
                      : "bg-[#E7F8F0] text-[#079566]"
                  )}
                >
                  {contact.ai_enabled === false ? "Manual" : "AI"}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  }

  function renderMessage(message: Message, compact = false) {
    const inbound = message.direction === "inbound";
    const translationKey = `${message.id}:${translationTarget}`;
    const translation = translations[translationKey];
    const showTranslateButton = canTranslateMessage(message);

    return (
      <div
        key={message.id}
        className={cx("flex", inbound ? "justify-start" : "justify-end")}
      >
        <div
          className={cx(
            compact
              ? "max-w-[84%] rounded-[18px] px-4 py-3 text-sm leading-6 shadow-sm"
              : "max-w-[76%] rounded-[20px] px-5 py-4 text-sm leading-6 shadow-sm",
            inbound
              ? isDark
                ? "border border-[#1F2937] bg-[#111827] text-white"
                : "border border-[#E2E8F0] bg-white text-[#0F172A]"
              : message.role === "manual"
                ? "border border-[#F5C26B] bg-[#FFF4E5] text-[#8A4B00]"
                : message.role === "system"
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-[#A8EACF] bg-[#D8F8E8] text-[#063C2E]"
          )}
        >
          <MessageBody
            message={message}
            isDark={isDark}
            mutedTextClass={mutedTextClass}
            translation={translation}
          />

          {showTranslateButton ? (
            <button
              type="button"
              onClick={() => translateMessage(message, true)}
              disabled={Boolean(translatingMap[translationKey])}
              className={cx(
                "mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black",
                isDark
                  ? "border-white/10 bg-white/[0.04] text-[#CBD5E1]"
                  : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
              )}
            >
              <Icon name="translate" className="h-3 w-3" />
              {translatingMap[translationKey]
                ? "Translating..."
                : `Translate to ${translationTarget}`}
            </button>
          ) : null}

          <p
            className={cx(
              compact
                ? "mt-1 flex items-center justify-end gap-1 text-right text-[10px] font-bold"
                : "mt-2 flex items-center justify-end gap-1 text-right text-[11px] font-bold",
              inbound
                ? mutedTextClass
                : message.role === "manual"
                  ? "text-[#B76A00]"
                  : message.role === "system"
                    ? "text-red-600"
                    : "text-[#08785A]"
            )}
          >
            <span>
              {compact
                ? formatTime(message.created_at)
                : `${getMessageOwner(message)} · ${formatDateTime(message.created_at)}`}
            </span>
            {messageStatusTicks(message)}
          </p>
        </div>
      </div>
    );
  }

  function renderMobileChatList() {
    return (
      <div className={cx("flex h-[100dvh] flex-col pb-24 md:hidden", pageClass)}>
        <header
          className={cx(
            "sticky top-0 z-20 border-b px-4 pb-3 pt-4 backdrop-blur-2xl",
            isDark ? "border-[#1F2937] bg-[#0B0F17]/95" : "border-[#E2E8F0] bg-[#F6F8FB]/95"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={cx("text-xs font-black uppercase tracking-[0.18em]", mutedTextClass)}>
                Artipilot
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Inbox</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                className={cx(
                  "flex h-10 w-10 items-center justify-center rounded-2xl border",
                  softPanelClass
                )}
              >
                <Icon name={isDark ? "sun" : "moon"} />
              </button>

              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="relative h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-[#20D3EE] to-[#34E7A9] text-sm font-black text-[#05201A]"
              >
                {userAvatarUrl ? (
                  <Image
                    src={userAvatarUrl}
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>A</span>
                )}
              </button>
            </div>
          </div>

          <div className="relative mt-4">
            <Icon
              name="search"
              className={cx(
                "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2",
                mutedTextClass
              )}
            />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search chats..."
              className={cx(
                "w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition",
                isDark
                  ? "border-[#1F2937] bg-[#101722] text-white placeholder:text-[#64748B] focus:border-[#2DD4A8]"
                  : "border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#7EDDBD]"
              )}
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              ["priority", "All"],
              ["human", `Human ${humanCount}`],
              ["unread", `Unread ${totalUnread}`],
              ["pinned", "Starred"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSortMode(value as SortMode)}
                className={cx(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-black transition",
                  sortMode === value
                    ? isDark
                      ? "border-[#2DD4A8] bg-[#163126] text-[#55E6B5]"
                      : "border-[#A8EACF] bg-[#E7F8F0] text-[#079566]"
                    : isDark
                      ? "border-[#1F2937] bg-[#101722] text-[#94A3B8]"
                      : "border-[#E2E8F0] bg-white text-[#64748B]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {humanCount > 0 ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700">
              {humanCount} chat{humanCount === 1 ? "" : "s"} need human attention.
            </div>
          ) : null}

          <div className="mt-3">
            <PushNotificationBox isDark={isDark} compact />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className={cx("rounded-2xl border p-4 text-sm", softPanelClass, mutedTextClass)}>
              Loading inbox...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className={cx("rounded-2xl border p-5 text-sm leading-6", softPanelClass, mutedTextClass)}>
              <p className={cx("font-black", isDark ? "text-white" : "text-[#0F172A]")}>
                {contacts.length === 0 ? "No messages yet" : "No chats found"}
              </p>
              <p className="mt-2">
                {contacts.length === 0
                  ? "Send a WhatsApp message to your connected number."
                  : "Try another search or filter."}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => renderContactCard(contact, true))
          )}
        </div>

        <MobileBottomNav isDark={isDark} />
      </div>
    );
  }

  function renderChatHeader(mobile = false) {
    return (
      <header
        className={cx(
          mobile
            ? "sticky top-0 z-20 border-b px-3 py-3 backdrop-blur-2xl"
            : "flex h-[72px] shrink-0 items-center justify-between border-b px-5",
          panelClass
        )}
      >
        <div className="flex w-full items-center gap-2">
          {mobile ? (
            <button
              type="button"
              onClick={() => {
                setMobileChatOpen(false);
                setMoreMenuOpen(false);
                setEmojiOpen(false);
              }}
              className={cx("flex h-10 w-10 items-center justify-center rounded-full", isDark ? "text-white" : "text-[#0F172A]")}
            >
              <Icon name="back" className="h-6 w-6" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => selectedContact && setProfileOpen(true)}
            className="min-w-0 flex flex-1 items-center gap-3 text-left"
            disabled={!selectedContact}
          >
            <ContactAvatar contact={selectedContact} size={mobile ? 40 : 44} />

            <div className="min-w-0">
              {!mobile ? (
                <p className={cx("text-xs font-bold", mutedTextClass)}>Selected chat</p>
              ) : null}
              <h2 className={cx("truncate font-black", mobile ? "text-sm" : "text-base")}>
                {selectedContact
                  ? selectedContact.name || selectedContact.phone
                  : "No chat selected"}
              </h2>
              {selectedContact ? (
                <p className={cx("truncate text-sm", mutedTextClass)}>
                  {selectedContact.phone}
                </p>
              ) : null}
            </div>
          </button>

          {!mobile ? (
            <>
              <label
                className={cx(
                  "hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-black xl:flex",
                  isDark
                    ? "border-[#1F2937] bg-[#0B111C] text-[#CBD5E1]"
                    : "border-[#E2E8F0] bg-white text-[#334155]"
                )}
              >
                <Icon name="translate" />
                <select
                  value={translationTarget}
                  onChange={(event) => {
                    setTranslations({});
                    setTranslationTarget(event.target.value);
                  }}
                  className="bg-transparent outline-none"
                >
                  {translationLanguages.map((language) => (
                    <option key={language} value={language}>
                      Translate to {language}
                    </option>
                  ))}
                </select>
              </label>

              <Link
                href="/dashboard/ai-training"
                className={cx(
                  "rounded-full border px-4 py-2 text-sm font-black transition",
                  isDark
                    ? "border-[#1F2937] bg-[#0B111C] text-[#CBD5E1] hover:bg-[#111827]"
                    : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                )}
              >
                AI Training
              </Link>

              <button
                type="button"
                onClick={() => updateAiEnabled(false)}
                disabled={!selectedContact || aiToggleSaving}
                className={cx(
                  "rounded-full border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                  !localAiEnabled
                    ? "border-[#F5C26B] bg-[#FFF4E5] text-[#B76A00]"
                    : "border-[#F5C26B] bg-[#FFF8ED] text-[#B76A00] hover:bg-[#FFF4E5]"
                )}
              >
                Take over
              </button>

              <button
                type="button"
                onClick={() => updateAiEnabled(true)}
                disabled={!selectedContact || aiToggleSaving}
                className={cx(
                  "rounded-full border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                  localAiEnabled
                    ? "border-[#A8EACF] bg-[#E7F8F0] text-[#079566]"
                    : isDark
                      ? "border-[#1F2937] bg-[#0B111C] text-[#CBD5E1] hover:bg-[#111827]"
                      : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                )}
              >
                Give back to AI
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => selectedContact && togglePinned(selectedContact)}
            disabled={!selectedContact}
            className={cx(
              "flex h-10 w-10 items-center justify-center rounded-full border transition disabled:opacity-50",
              selectedPinned
                ? "border-[#F5C26B] bg-[#FFF4E5] text-[#B76A00]"
                : isDark
                  ? "border-[#1F2937] bg-[#0B111C] text-[#CBD5E1] hover:bg-[#111827]"
                  : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"
            )}
          >
            <Icon name="pin" />
          </button>

          <button
            type="button"
            onClick={() => setMoreMenuOpen((current) => !current)}
            disabled={!selectedContact}
            className={cx(
              "flex h-10 w-10 items-center justify-center rounded-full border transition disabled:opacity-50",
              isDark
                ? "border-[#1F2937] bg-[#0B111C] text-[#CBD5E1] hover:bg-[#111827]"
                : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"
            )}
          >
            <Icon name="dots" />
          </button>
        </div>

        {moreMenuOpen && selectedContact ? (
          <div
            className={cx(
              "absolute right-3 top-14 z-40 w-[230px] rounded-2xl border p-2 shadow-xl",
              panelClass
            )}
          >
            <button
              type="button"
              onClick={() => {
                setProfileOpen(true);
                setMoreMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold hover:bg-black/5"
            >
              <Icon name="profile" />
              View contact
            </button>

            <button
              type="button"
              onClick={() => selectedContact && togglePinned(selectedContact)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold hover:bg-black/5"
            >
              <Icon name="pin" />
              {selectedPinned ? "Unstar chat" : "Star chat"}
            </button>

            <button
              type="button"
              onClick={() =>
                selectedMuted
                  ? unmuteContact(selectedContact)
                  : muteContact(selectedContact, 24)
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold hover:bg-black/5"
            >
              <Icon name="bell" />
              {selectedMuted ? "Unmute" : "Mute 24 hours"}
            </button>

            <button
              type="button"
              onClick={() => setBlocked(selectedContact, !selectedBlocked)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold hover:bg-black/5"
            >
              <Icon name="block" />
              {selectedBlocked ? "Unblock contact" : "Block contact"}
            </button>

            <button
              type="button"
              onClick={() => selectedContact && setClosed(selectedContact, !selectedClosed)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold hover:bg-black/5"
            >
              <Icon name="check" />
              {selectedClosed ? "Reopen chat" : "Close chat"}
            </button>

            <button
              type="button"
              onClick={() => {
                setReportOpen(true);
                setMoreMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold hover:bg-black/5"
            >
              <Icon name="warning" />
              Report
            </button>

            <button
              type="button"
              onClick={deleteSelectedChat}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-black text-red-600 hover:bg-red-50"
            >
              <Icon name="trash" />
              Delete chat
            </button>
          </div>
        ) : null}
      </header>
    );
  }

  function renderMessages(compact = false) {
    return (
      <>
        {selectedContact && selectedHumanAttention ? (
          <div
            className={cx(
              "border-b px-5 py-3 text-sm font-bold",
              isDark
                ? "border-red-500/30 bg-red-950/30 text-red-100"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Icon name="warning" />
              <span>This chat needs human attention.</span>
              {selectedContact.human_attention_reason ? (
                <span className="font-medium opacity-90">
                  Reason: {selectedContact.human_attention_reason}
                </span>
              ) : (
                <span className="font-medium opacity-90">
                  AI may need help or the customer asked for the team.
                </span>
              )}

              <button
                type="button"
                onClick={() => markHumanHandled(selectedContact)}
                className={cx(
                  "ml-auto rounded-full border px-3 py-1 text-xs font-black",
                  isDark
                    ? "border-red-400/30 bg-red-500/10 text-red-100"
                    : "border-red-200 bg-white text-red-700"
                )}
              >
                Mark handled
              </button>
            </div>
          </div>
        ) : null}

        {selectedContact && selectedBlocked ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700">
            This contact is blocked. You cannot send messages until you unblock them.
          </div>
        ) : null}

        {compact && selectedContact ? (
          <div className={cx("border-b px-3 py-2", panelClass)}>
            <label
              className={cx(
                "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black",
                softPanelClass
              )}
            >
              <Icon name="translate" />
              <select
                value={translationTarget}
                onChange={(event) => {
                  setTranslations({});
                  setTranslationTarget(event.target.value);
                }}
                className={cx("w-full bg-transparent outline-none", isDark ? "text-white" : "text-[#0F172A]")}
              >
                {translationLanguages.map((language) => (
                  <option key={language} value={language}>
                    Translate to {language}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div
          className={cx(
            "min-h-0 flex-1 overflow-y-auto",
            compact ? "px-3 py-4" : "px-6 py-5",
            isDark
              ? "bg-[#090E16]"
              : "bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.08),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(46,230,168,0.06),transparent_30%),#F7FAFE]"
          )}
        >
          {!selectedContact ? (
            <div className="flex h-full items-center justify-center">
              <div className={cx("max-w-md rounded-[24px] border p-8 text-center shadow-sm", panelClass)}>
                <p className={compact ? "text-xl font-black" : "text-2xl font-black"}>
                  No chat selected
                </p>
                {!compact ? (
                  <p className={cx("mt-3 text-sm leading-6", mutedTextClass)}>
                    Choose a chat from the left side to view the conversation.
                  </p>
                ) : null}
              </div>
            </div>
          ) : selectedMessages.length === 0 ? (
            <div className={cx("rounded-2xl border p-5 text-sm", softPanelClass, mutedTextClass)}>
              No messages for this contact yet.
            </div>
          ) : (
            <div className={cx("mx-auto flex flex-col gap-4", compact ? "" : "max-w-5xl")}>
              {selectedMessages.map((message) => renderMessage(message, compact))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </>
    );
  }

  function renderComposer(compact = false) {
    return (
      <footer className={cx("shrink-0 border-t", compact ? "p-2" : "px-6 py-4", panelClass)}>
        {sendError ? (
          <div className="mx-auto mb-3 max-w-5xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {sendError}
          </div>
        ) : null}

        {localActionNotice ? (
          <div className={cx("mx-auto mb-3 max-w-5xl rounded-2xl border px-4 py-3 text-sm font-bold", softPanelClass)}>
            {localActionNotice}
            <button
              type="button"
              onClick={() => setLocalActionNotice("")}
              className="ml-3 text-xs underline"
            >
              hide
            </button>
          </div>
        ) : null}

        <div className={cx("mx-auto max-w-5xl rounded-[22px] border p-3", softPanelClass)}>
          {!compact ? (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((current) => !current)}
                  className={cx("flex h-9 w-9 items-center justify-center rounded-xl transition", isDark ? "bg-[#111827] text-[#CBD5E1]" : "bg-white text-[#64748B]")}
                >
                  <Icon name="emoji" />
                </button>

                {emojiOpen ? (
                  <div className={cx("absolute bottom-11 left-0 z-30 grid w-[230px] grid-cols-6 gap-2 rounded-2xl border p-3 shadow-xl", panelClass)}>
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleTyping(`${manualReply}${emoji}`)}
                        className="rounded-xl p-2 text-lg hover:bg-black/5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}

                <input
                  ref={documentInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                  onChange={handleDocumentUpload}
                />

                <input
                  ref={mediaInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                />

                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  className={cx("flex h-9 w-9 items-center justify-center rounded-xl transition", isDark ? "bg-[#111827] text-[#CBD5E1]" : "bg-white text-[#64748B]")}
                >
                  <Icon name="attachment" />
                </button>

                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className={cx("flex h-9 w-9 items-center justify-center rounded-xl transition", isDark ? "bg-[#111827] text-[#CBD5E1]" : "bg-white text-[#64748B]")}
                >
                  <Icon name="image" />
                </button>
              </div>

              <button
                type="button"
                onClick={generateAiSuggestion}
                disabled={!selectedContact}
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                  "border border-[#A8EACF] bg-[#E7F8F0] text-[#079566] hover:bg-[#DDF5EA]"
                )}
              >
                <Icon name="spark" />
                AI suggestion
              </button>
            </div>
          ) : null}

          <div className="flex items-end gap-3">
            {compact ? (
              <button
                type="button"
                onClick={() => setEmojiOpen((current) => !current)}
                className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", softPanelClass)}
              >
                <Icon name="emoji" />
              </button>
            ) : null}

            <textarea
              value={manualReply}
              onChange={(event) => handleTyping(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              disabled={!selectedContact || sending || selectedBlocked}
              rows={1}
              placeholder={
                selectedBlocked
                  ? "This contact is blocked..."
                  : selectedContact
                    ? compact
                      ? "Message..."
                      : "Write a manual reply..."
                    : "Select a chat to reply..."
              }
              className={cx(
                compact
                  ? "max-h-28 min-h-[44px] flex-1 resize-none rounded-[1.4rem] border px-4 py-3 text-sm outline-none transition"
                  : "max-h-28 min-h-[50px] w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition",
                isDark
                  ? "border-[#1F2937] bg-[#0B111C] text-white placeholder:text-[#64748B] focus:border-[#2DD4A8]"
                  : "border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#7EDDBD]",
                !selectedContact || sending || selectedBlocked
                  ? "cursor-not-allowed opacity-60"
                  : ""
              )}
            />

            <button
              type="button"
              onClick={sendManualReply}
              disabled={!selectedContact || sending || !manualReply.trim() || selectedBlocked}
              className={cx(
                compact
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  : "inline-flex h-[50px] items-center gap-2 rounded-2xl bg-[#CFF7DF] px-6 font-black text-[#08785A] transition hover:bg-[#B8F0D2] disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <Icon name="send" className="h-5 w-5" />
              {!compact ? (sending ? "Sending..." : "Send") : null}
            </button>
          </div>

          {compact && emojiOpen ? (
            <div className={cx("mt-2 grid grid-cols-6 gap-2 rounded-2xl border p-3", softPanelClass)}>
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleTyping(`${manualReply}${emoji}`)}
                  className="rounded-xl p-2 text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!compact ? (
          <p className={cx("mt-3 text-center text-xs", mutedTextClass)}>
            Manual replies send through your connected WhatsApp Cloud API.
          </p>
        ) : null}
      </footer>
    );
  }

  function renderMobileChat() {
    return (
      <div className={cx("flex h-[100dvh] flex-col md:hidden", pageClass)}>
        {renderChatHeader(true)}
        {renderMessages(true)}
        {renderComposer(true)}
      </div>
    );
  }

  return (
    <main className={cx("h-screen overflow-hidden", pageClass)}>
      {mobileChatOpen ? renderMobileChat() : renderMobileChatList()}

      <div className="relative hidden h-screen overflow-hidden md:flex">
        <aside
          onMouseEnter={() => setNavExpanded(true)}
          onMouseLeave={() => setNavExpanded(false)}
          className={cx(
            "hidden h-screen shrink-0 flex-col border-r transition-all duration-300 lg:flex",
            navExpanded ? "w-[220px]" : "w-[72px]",
            panelClass
          )}
        >
          <div
            className={cx(
              "flex items-center gap-3 px-4 py-4",
              !navExpanded && "justify-center px-0"
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-black shadow-sm">
              <Image
                src="/artipilot-logo.png"
                alt="Artipilot logo"
                width={34}
                height={34}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>

            {navExpanded ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-black">Artipilot</p>
                <p className={cx("truncate text-xs", mutedTextClass)}>
                  AI WhatsApp Automation
                </p>
              </div>
            ) : null}
          </div>

          <nav className="space-y-1.5 px-3">
            {navItems.map((item) => {
              const active = item.label === "Inbox";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cx(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition",
                    active
                      ? isDark
                        ? "bg-[#163126] text-[#55E6B5]"
                        : "bg-[#E7F8F0] text-[#079566]"
                      : isDark
                        ? "text-[#94A3B8] hover:bg-white/[0.04] hover:text-white"
                        : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  )}
                >
                  <div
                    className={cx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      active
                        ? isDark
                          ? "bg-[#0F261F]"
                          : "bg-[#D7F5E7]"
                        : isDark
                          ? "bg-white/[0.04]"
                          : "bg-[#F1F5F9]"
                    )}
                  >
                    <Icon name={item.icon} />
                  </div>

                  {navExpanded ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 px-3 pb-4">
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className={cx(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition",
                isDark
                  ? "bg-white/[0.04] text-[#E2E8F0] hover:bg-white/[0.07]"
                  : "bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
              )}
            >
              <div
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  isDark ? "bg-white/[0.05]" : "bg-white"
                )}
              >
                <Icon name={isDark ? "sun" : "moon"} />
              </div>
              {navExpanded ? <span>{isDark ? "Light theme" : "Dark theme"}</span> : null}
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className={cx(
                "relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                isDark ? "bg-white/[0.04]" : "bg-[#F1F5F9]",
                !navExpanded && "justify-center"
              )}
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#20D3EE] to-[#34E7A9] text-sm font-black text-[#05201A]">
                {userAvatarUrl ? (
                  <Image
                    src={userAvatarUrl}
                    alt="User avatar"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">A</div>
                )}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#22C55E]" />
              </div>

              {navExpanded ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">Profile</p>
                  <p className={cx("truncate text-xs", mutedTextClass)}>
                    {userEmail || "Workspace user"}
                  </p>
                </div>
              ) : null}
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 overflow-hidden">
          <div className={cx("flex h-screen w-[390px] shrink-0 flex-col border-r", panelClass)}>
            <div className={cx("shrink-0 border-b px-5 py-4", isDark ? "border-[#1F2937]" : "border-[#E2E8F0]")}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={cx("text-xs font-black uppercase tracking-[0.14em]", mutedTextClass)}>
                    Inbox
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight">
                    Customer chats
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => setCustomizeOpen(true)}
                  className={cx(
                    "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                    isDark
                      ? "border-[#1F2937] bg-[#0B111C] text-[#CBD5E1] hover:bg-[#111827]"
                      : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                  )}
                  title="Customize inbox"
                >
                  <Icon name="settings" />
                </button>
              </div>

              <div className="relative mt-4">
                <Icon
                  name="search"
                  className={cx(
                    "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2",
                    mutedTextClass
                  )}
                />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search name, phone, message..."
                  className={cx(
                    "w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none transition",
                    isDark
                      ? "border-[#1F2937] bg-[#0B111C] text-white placeholder:text-[#64748B] focus:border-[#2DD4A8]"
                      : "border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#7EDDBD]"
                  )}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className={cx("flex items-center gap-2 rounded-2xl border px-3 py-2", softPanelClass)}>
                  <Icon name="calendar" className={mutedTextClass} />
                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                    className={cx(
                      "w-full bg-transparent text-sm font-bold outline-none",
                      isDark ? "text-white" : "text-[#0F172A]"
                    )}
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                  </select>
                </label>

                <label className={cx("flex items-center gap-2 rounded-2xl border px-3 py-2", softPanelClass)}>
                  <Icon name="filter" className={mutedTextClass} />
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className={cx(
                      "w-full bg-transparent text-sm font-bold outline-none",
                      isDark ? "text-white" : "text-[#0F172A]"
                    )}
                  >
                    <option value="priority">Priority</option>
                    <option value="newest">Newest</option>
                    <option value="human">Human attention</option>
                    <option value="unread">Unread</option>
                    <option value="pinned">Starred</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>

              <div className={cx("mt-3 flex items-center justify-between text-xs", mutedTextClass)}>
                <span>{filteredContacts.length} chats</span>
                <span>{humanCount} human alerts · {totalUnread} unread</span>
              </div>

              {humanCount > 0 ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700">
                  {humanCount} chat{humanCount === 1 ? "" : "s"} need human attention and are shown first.
                </div>
              ) : null}

              <div className="mt-3">
                <PushNotificationBox isDark={isDark} />
              </div>

              {loadError ? (
                <div
                  className={cx(
                    "mt-3 rounded-2xl border px-4 py-3 text-sm font-bold",
                    isDark
                      ? "border-red-500/20 bg-red-950/30 text-red-200"
                      : "border-red-200 bg-red-50 text-red-700"
                  )}
                >
                  {loadError}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className={cx("rounded-2xl border p-4 text-sm", softPanelClass, mutedTextClass)}>
                  Loading inbox...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className={cx("rounded-2xl border p-5 text-sm leading-6", softPanelClass, mutedTextClass)}>
                  <p className={cx("font-black", isDark ? "text-white" : "text-[#0F172A]")}>
                    {contacts.length === 0 ? "No messages yet" : "No chats found"}
                  </p>
                  <p className="mt-2">
                    {contacts.length === 0
                      ? "Send a WhatsApp message to your connected number."
                      : "Try another search or filter."}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => renderContactCard(contact))
              )}
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 flex-col md:flex">
            {renderChatHeader(false)}
            {renderMessages(false)}
            {renderComposer(false)}
          </div>
        </section>
      </div>

      {profileOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className={cx("w-full max-w-md rounded-[28px] border p-6 shadow-2xl", panelClass)}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">
                {selectedContact ? "Customer profile" : "Your profile"}
              </p>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className={cx("flex h-9 w-9 items-center justify-center rounded-xl border", softPanelClass)}
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center text-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-[#22D3EE] to-[#34E7A9] text-3xl font-black text-[#05201A]">
                {selectedContact && getContactPhoto(selectedContact) ? (
                  <Image
                    src={String(getContactPhoto(selectedContact))}
                    alt={selectedContact.name || selectedContact.phone}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : userAvatarUrl ? (
                  <Image
                    src={userAvatarUrl}
                    alt="User avatar"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {selectedContact
                      ? getInitial(selectedContact.name, selectedContact.phone)
                      : "A"}
                  </div>
                )}
                <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-white bg-[#22C55E]" />
              </div>

              <h3 className="mt-4 text-2xl font-black">
                {selectedContact
                  ? selectedContact.name || "Unknown customer"
                  : userEmail || "Workspace user"}
              </h3>

              <p className={cx("mt-1 text-sm", mutedTextClass)}>
                {selectedContact ? selectedContact.phone : "Online"}
              </p>

              {selectedContact && needsHumanAttention(selectedContact) ? (
                <div className="mt-4 w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm font-bold text-red-700">
                  Human attention needed for this customer.
                  {selectedContact.human_attention_reason ? (
                    <p className="mt-1 font-medium">
                      {selectedContact.human_attention_reason}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className={cx("mt-5 w-full rounded-2xl border p-4 text-left", softPanelClass)}>
                <p className="text-xs font-black uppercase tracking-[0.14em]">Profile details</p>
                <p className={cx("mt-3 text-sm leading-6", mutedTextClass)}>
                  {selectedContact
                    ? getContactNote(selectedContact) ||
                      "Meta Cloud API may not provide real profile photo, online status, or customer bio. This panel is ready for the data when available."
                    : "This profile uses your connected Google account picture when Supabase provides it."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {customizeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className={cx("w-full max-w-lg rounded-[28px] border p-6 shadow-2xl", panelClass)}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">Customize inbox</p>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className={cx("flex h-9 w-9 items-center justify-center rounded-xl border", softPanelClass)}
              >
                <Icon name="close" />
              </button>
            </div>

            <p className={cx("mt-3 text-sm leading-6", mutedTextClass)}>
              Theme and translation target are saved on this device. Translation only appears for real text messages, not images, videos, audio, documents, or locations.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cx(
                  "rounded-2xl border p-4 text-left",
                  theme === "light"
                    ? "border-[#A8EACF] bg-[#E7F8F0]"
                    : softPanelClass
                )}
              >
                <Icon name="sun" />
                <p className="mt-3 font-black">Light theme</p>
                <p className={cx("mt-1 text-sm", mutedTextClass)}>Clean and comfortable.</p>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cx(
                  "rounded-2xl border p-4 text-left",
                  theme === "dark"
                    ? "border-[#2DD4A8] bg-[#0F2A23]"
                    : softPanelClass
                )}
              >
                <Icon name="moon" />
                <p className="mt-3 font-black">Dark theme</p>
                <p className={cx("mt-1 text-sm", mutedTextClass)}>Better for night usage.</p>
              </button>
            </div>

            <label className={cx("mt-5 flex items-center gap-2 rounded-2xl border px-4 py-3", softPanelClass)}>
              <Icon name="translate" />
              <select
                value={translationTarget}
                onChange={(event) => {
                  setTranslations({});
                  setTranslationTarget(event.target.value);
                }}
                className={cx("w-full bg-transparent text-sm font-black outline-none", isDark ? "text-white" : "text-[#0F172A]")}
              >
                {translationLanguages.map((language) => (
                  <option key={language} value={language}>
                    Auto translate customer text messages to {language}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {reportOpen && selectedContact ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className={cx("w-full max-w-md rounded-[28px] border p-6 shadow-2xl", panelClass)}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">Report chat</p>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className={cx("flex h-9 w-9 items-center justify-center rounded-xl border", softPanelClass)}
              >
                <Icon name="close" />
              </button>
            </div>

            <p className={cx("mt-3 text-sm leading-6", mutedTextClass)}>
              Choose why you want to report this chat.
            </p>

            <div className="mt-5 space-y-2">
              {["Abuse", "Harassment", "Racism", "Insulting language", "Spam", "Other"].map(
                (reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setLocalActionNotice(`Report sent: ${reason}.`);
                      setReportOpen(false);
                    }}
                    className={cx("w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold", softPanelClass)}
                  >
                    {reason}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}