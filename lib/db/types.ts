export type Contact = {
  id: string;
  whatsapp_id: string | null;
  phone: string;
  name: string | null;
  profile_name: string | null;
  ai_enabled: boolean;
  ai_paused_until: string | null;
  archived: boolean;
  blocked: boolean;
  notes: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  contact_id: string;
  whatsapp_message_id: string | null;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "admin" | "ai" | "system";
  message_type: string;
  body: string | null;
  status: string | null;
  status_error: string | null;
  deleted_for_me: boolean;
  deleted_for_everyone: boolean;
  raw_payload: unknown;
  created_at: string;
  updated_at: string;
};

export type TrainingKnowledge = {
  id: string;
  title: string;
  category: string | null;
  content: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type QuickReply = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  active: boolean;
  created_at: string;
};

export type AiSettingsMap = {
  ai_name?: string;
  tone?: string;
  main_job?: string;
  business_rules?: string;
  handoff_rules?: string;
  language_rule?: string;
  booking_link?: string;
  business_name?: string;
};
