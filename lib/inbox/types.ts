export type Contact = {
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

export type Message = {
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

export type InboxData = {
  contacts?: Contact[];
  messages?: Message[];
  error?: string;
};

export type TranslationResult = {
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
};

export type MobileFilter = "all" | "unread" | "favorites" | "groups" | "human";
export type ThemeMode = "light" | "dark";

export type IconName =
  | "menu"
  | "newChat"
  | "filter"
  | "search"
  | "camera"
  | "dots"
  | "video"
  | "phone"
  | "emoji"
  | "attach"
  | "mic"
  | "send"
  | "back"
  | "home"
  | "whatsapp"
  | "training"
  | "inbox"
  | "settings"
  | "billing"
  | "moon"
  | "sun"
  | "star"
  | "archive"
  | "pin"
  | "bell"
  | "trash"
  | "block"
  | "translate"
  | "spark"
  | "close"
  | "check"
  | "logout";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};
