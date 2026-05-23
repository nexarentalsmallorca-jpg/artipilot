import type { Contact, Message } from "./types";

export const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: "home" as const },
  { label: "WhatsApp", href: "/dashboard/whatsapp", icon: "whatsapp" as const },
  { label: "Training", href: "/dashboard/ai-training", icon: "training" as const },
  { label: "Inbox", href: "/dashboard/inbox", icon: "inbox" as const },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" as const },
  { label: "Billing", href: "/dashboard/billing", icon: "billing" as const },
];

export const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "✅", "🔥", "🛵", "📍", "💳", "📄"];

export const TRANSLATION_LANGUAGES = ["English", "Spanish", "German", "French", "Italian", "Portuguese"];

const ATTENTION_KEYWORDS = [
  "human", "person", "agent", "team", "manager", "urgent", "problem", "issue",
  "refund", "complaint", "angry", "accident", "damage", "insurance", "police",
  "call me", "speak to", "help me",
];

const AI_HANDOFF_KEYWORDS = [
  "team will reply", "team will confirm", "human team", "real person",
  "pass you to the team", "forward this to the team", "i cannot confirm",
  "i can't confirm", "not sure", "not covered",
];

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function cleanPhone(phone: string) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

export function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

export function displayName(contact: Contact | null) {
  if (!contact) return "Select chat";
  return contact.name?.trim() || contact.phone;
}

export function getInitial(contact: Contact | null) {
  const name = contact?.name?.trim();
  if (name) return name.charAt(0).toUpperCase();
  if (contact?.phone) return contact.phone.slice(-2);
  return "?";
}

export function formatTime(dateString?: string | null) {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(dateString));
  } catch {
    return "";
  }
}

export function formatListTime(dateString?: string | null) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date >= today) {
      return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
    }
    if (date >= yesterday) return "Yesterday";
    return new Intl.DateTimeFormat("en", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
  } catch {
    return "";
  }
}

export function formatDateDivider(dateString: string) {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date >= today) return "Today";
    if (date >= yesterday) return "Yesterday";
    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  } catch {
    return "";
  }
}

export function formatLastSeen(dateString?: string | null) {
  if (!dateString) return "last seen recently";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "last seen recently";
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 2) return "online";
    if (diffMins < 60) return `last seen ${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `last seen today at ${formatTime(dateString)}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return `last seen yesterday at ${formatTime(dateString)}`;
    if (diffDays < 7) return `last seen ${diffDays} days ago`;
    return `last seen ${formatListTime(dateString)}`;
  } catch {
    return "last seen recently";
  }
}

export function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function getContactPhoto(contact: Contact | null) {
  if (!contact) return null;
  return contact.profile_image_url || contact.customer_photo_url || null;
}

export function isOutbound(message: Message) {
  return message.direction === "outbound" || message.role === "assistant" || message.role === "manual";
}

export function getMessageOwner(message: Message) {
  if (message.role === "assistant") return "AI";
  if (message.role === "manual") return "You";
  if (message.role === "system") return "System";
  return "";
}

export function messageStatus(message: Message) {
  return message.delivery_status || message.status || (isOutbound(message) ? "sent" : "received");
}

export function messageTriggersHuman(message: Message) {
  const content = normalizeText(String(message.content || ""));
  if (!content) return false;
  if (message.role === "system") return true;
  if (message.role === "customer") return ATTENTION_KEYWORDS.some((keyword) => content.includes(keyword));
  if (message.role === "assistant") return AI_HANDOFF_KEYWORDS.some((keyword) => content.includes(keyword));
  return false;
}

export function canTranslateMessage(message: Message) {
  const content = String(message.content || "").trim();
  const type = String(message.message_type || "text").toLowerCase();
  return message.role === "customer" && message.direction === "inbound" && Boolean(content) && (!type || type === "text");
}

export function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function groupMessagesByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let currentLabel = "";

  for (const message of messages) {
    const label = formatDateDivider(message.created_at) || "Messages";
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [message] });
    } else {
      groups[groups.length - 1].messages.push(message);
    }
  }

  return groups;
}
