/** Primary tables used by the private dashboard (legacy names kept for compatibility). */
export const DB = {
  workspaces: "artipilot_workspaces",
  contacts: "artipilot_contacts",
  messages: "artipilot_messages",
  whatsappConnections: "artipilot_whatsapp_connections",
  pushSubscriptions: "artipilot_push_subscriptions",
  trainingKnowledge: "training_knowledge",
  aiSettings: "ai_settings",
  quickReplies: "quick_replies",
  messageStatusEvents: "message_status_events",
  attachments: "attachments",
} as const;
