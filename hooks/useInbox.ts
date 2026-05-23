"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  canTranslateMessage,
  cleanPhone,
  displayName,
  isMobileViewport,
  messageTriggersHuman,
  normalizePhone,
} from "@/lib/inbox/helpers";
import type {
  Contact,
  InboxData,
  Message,
  MobileFilter,
  ThemeMode,
  TranslationResult,
} from "@/lib/inbox/types";

export function useInbox() {
  const searchParams = useSearchParams();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>("all");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [manualReply, setManualReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [localAiEnabled, setLocalAiEnabled] = useState(true);
  const [aiToggleSaving, setAiToggleSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [chatListMenuOpen, setChatListMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [localNotice, setLocalNotice] = useState("");
  const [translationTarget, setTranslationTarget] = useState("English");
  const translationTargetRef = useRef("English");
  const [translations, setTranslations] = useState<Record<string, TranslationResult>>({});
  const [translatingMap, setTranslatingMap] = useState<Record<string, boolean>>({});
  const [localPinnedMap, setLocalPinnedMap] = useState<Record<string, boolean>>({});
  const [localBlockedMap, setLocalBlockedMap] = useState<Record<string, boolean>>({});
  const [localMutedMap, setLocalMutedMap] = useState<Record<string, string | null>>({});
  const [localHandledMap, setLocalHandledMap] = useState<Record<string, string>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  const selectedPhoneRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    const savedTheme = localStorage.getItem("artipilot_theme");
    const savedPinned = localStorage.getItem("artipilot_inbox_pinned_map");
    const savedBlocked = localStorage.getItem("artipilot_inbox_blocked_map");
    const savedMuted = localStorage.getItem("artipilot_inbox_muted_map");
    const savedHandled = localStorage.getItem("artipilot_inbox_human_handled_map");
    const savedTarget = localStorage.getItem("artipilot_translation_target");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedTarget) {
      setTranslationTarget(savedTarget);
      translationTargetRef.current = savedTarget;
    }
    try {
      if (savedPinned) setLocalPinnedMap(JSON.parse(savedPinned));
      if (savedBlocked) setLocalBlockedMap(JSON.parse(savedBlocked));
      if (savedMuted) setLocalMutedMap(JSON.parse(savedMuted));
      if (savedHandled) setLocalHandledMap(JSON.parse(savedHandled));
    } catch {
      console.error("Could not load saved inbox settings.");
    }
  }, []);

  useEffect(() => {
    translationTargetRef.current = translationTarget;
    localStorage.setItem("artipilot_theme", theme);
    localStorage.setItem("artipilot_translation_target", translationTarget);
    localStorage.setItem("artipilot_inbox_pinned_map", JSON.stringify(localPinnedMap));
    localStorage.setItem("artipilot_inbox_blocked_map", JSON.stringify(localBlockedMap));
    localStorage.setItem("artipilot_inbox_muted_map", JSON.stringify(localMutedMap));
    localStorage.setItem("artipilot_inbox_human_handled_map", JSON.stringify(localHandledMap));
  }, [theme, translationTarget, localPinnedMap, localBlockedMap, localMutedMap, localHandledMap]);

  const contactByPhone = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach((contact) => map.set(contact.phone, contact));
    return map;
  }, [contacts]);

  const selectedContact = selectedPhone ? contactByPhone.get(selectedPhone) || null : null;

  const selectedMessages = useMemo(() => {
    if (!selectedPhone) return [];
    return messages
      .filter((message) => normalizePhone(message.contact_phone) === normalizePhone(selectedPhone))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, selectedPhone]);

  const latestMessageAtByPhone = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages) {
      const current = map.get(message.contact_phone);
      if (!current || new Date(message.created_at).getTime() > new Date(current).getTime()) {
        map.set(message.contact_phone, message.created_at);
      }
    }
    return map;
  }, [messages]);

  const inferredHumanPhones = useMemo(() => {
    const phones = new Set<string>();
    contacts.forEach((contact) => {
      if (contact.needs_human_attention || contact.human_attention) phones.add(contact.phone);
    });
    messages.forEach((message) => {
      if (messageTriggersHuman(message)) phones.add(message.contact_phone);
    });
    return phones;
  }, [contacts, messages]);

  const isPinned = useCallback(
    (contact: Contact) => Boolean(contact.is_starred || contact.pinned || localPinnedMap[contact.phone]),
    [localPinnedMap]
  );

  const isBlocked = useCallback(
    (contact: Contact) =>
      Boolean(
        contact.is_blocked ||
          contact.blocked ||
          contact.conversation_status === "blocked" ||
          localBlockedMap[contact.phone]
      ),
    [localBlockedMap]
  );

  const isMuted = useCallback(
    (contact: Contact) => {
      const until = localMutedMap[contact.phone] || contact.muted_until;
      if (!until) return false;
      return new Date(until).getTime() > Date.now();
    },
    [localMutedMap]
  );

  const needsHuman = useCallback(
    (contact: Contact) => {
      const handled = localHandledMap[contact.phone];
      if (handled) {
        const latest = latestMessageAtByPhone.get(contact.phone);
        if (!latest || new Date(latest).getTime() <= Number(handled)) return false;
      }
      return Boolean(contact.needs_human_attention || contact.human_attention || inferredHumanPhones.has(contact.phone));
    },
    [inferredHumanPhones, latestMessageAtByPhone, localHandledMap]
  );

  const unreadCount = useMemo(
    () => contacts.reduce((total, contact) => total + Number(contact.unread_count || 0), 0),
    [contacts]
  );

  const favoritesCount = useMemo(
    () => contacts.filter((contact) => isPinned(contact)).length,
    [contacts, isPinned]
  );

  const humanCount = useMemo(
    () => contacts.filter((contact) => needsHuman(contact)).length,
    [contacts, needsHuman]
  );

  const filteredContacts = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    return [...contacts]
      .filter((contact) => {
        const haystack = `${contact.name || ""} ${contact.phone || ""} ${contact.last_message || ""}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        const matchesFilter =
          mobileFilter === "all" ||
          (mobileFilter === "unread" && Number(contact.unread_count || 0) > 0) ||
          (mobileFilter === "favorites" && isPinned(contact)) ||
          (mobileFilter === "human" && needsHuman(contact)) ||
          mobileFilter === "groups";
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const aBlocked = isBlocked(a) ? 1 : 0;
        const bBlocked = isBlocked(b) ? 1 : 0;
        const aHuman = needsHuman(a) ? 1 : 0;
        const bHuman = needsHuman(b) ? 1 : 0;
        const aPinned = isPinned(a) ? 1 : 0;
        const bPinned = isPinned(b) ? 1 : 0;
        const aUnread = Number(a.unread_count || 0) > 0 ? 1 : 0;
        const bUnread = Number(b.unread_count || 0) > 0 ? 1 : 0;
        const aTime = new Date(a.last_message_at || a.created_at).getTime();
        const bTime = new Date(b.last_message_at || b.created_at).getTime();
        if (aBlocked !== bBlocked) return aBlocked - bBlocked;
        if (aHuman !== bHuman) return bHuman - aHuman;
        if (aPinned !== bPinned) return bPinned - aPinned;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return bTime - aTime;
      });
  }, [contacts, searchValue, mobileFilter, isPinned, needsHuman, isBlocked]);

  const loadInbox = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch("/api/inbox", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data: InboxData = await res.json();
        if (!res.ok) {
          setLoadError((previous) => {
            if (silent && contacts.length > 0) return previous;
            return data?.error || "Failed to load inbox.";
          });
          return;
        }
        setLoadError("");
        const nextContacts = data.contacts || [];
        const nextMessages = data.messages || [];
        setContacts(nextContacts);
        setMessages(nextMessages);
        const current = selectedPhoneRef.current;
        if (!current && nextContacts[0]?.phone) {
          const first = [...nextContacts].sort(
            (a, b) =>
              new Date(b.last_message_at || b.created_at).getTime() -
              new Date(a.last_message_at || a.created_at).getTime()
          )[0];
          setSelectedPhone(first.phone);
          selectedPhoneRef.current = first.phone;
        }
        if (current && !nextContacts.some((contact) => normalizePhone(contact.phone) === normalizePhone(current))) {
          const nextPhone = nextContacts[0]?.phone || null;
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
    [contacts.length]
  );

  useEffect(() => {
    void loadInbox();
    const interval = window.setInterval(() => void loadInbox(true), 3500);
    return () => window.clearInterval(interval);
  }, [loadInbox]);

  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedMessages.length, selectedPhone]);

  async function updateContactForPhone(phone: string, payload: Record<string, unknown>) {
    try {
      const res = await fetch("/api/inbox/contact", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone(phone), ...payload }),
      });
      return res.ok;
    } catch (error) {
      console.error("Contact update error:", error);
      return false;
    }
  }

  async function markChatAsRead(phone: string) {
    setContacts((previous) =>
      previous.map((contact) =>
        normalizePhone(contact.phone) === normalizePhone(phone) ? { ...contact, unread_count: 0 } : contact
      )
    );
    try {
      await fetch("/api/inbox/mark-read", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone(phone) }),
      });
    } catch (error) {
      console.error("Mark read error:", error);
    }
  }

  const selectChat = useCallback(
    async (contact: Contact, openMobile = false) => {
      setSelectedPhone(contact.phone);
      selectedPhoneRef.current = contact.phone;
      setLocalAiEnabled(contact.ai_enabled !== false);
      setEmojiOpen(false);
      setMoreMenuOpen(false);
      setChatListMenuOpen(false);
      setSendError("");
      if (openMobile) setMobileChatOpen(true);
      if (Number(contact.unread_count || 0) > 0) await markChatAsRead(contact.phone);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSelectContact = useCallback(
    (contact: Contact) => {
      void selectChat(contact, isMobileViewport());
    },
    [selectChat]
  );

  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (!phoneParam || deepLinkHandled || contacts.length === 0) return;

    const match = contacts.find(
      (contact) => normalizePhone(contact.phone) === normalizePhone(phoneParam)
    );
    if (match) {
      void selectChat(match, isMobileViewport());
      setDeepLinkHandled(true);
    }
  }, [contacts, deepLinkHandled, searchParams, selectChat]);

  async function sendManualReply() {
    if (!selectedContact) return setSendError("Please select a chat first.");
    if (isBlocked(selectedContact)) return setSendError("This contact is blocked. Unblock it before sending.");
    const text = manualReply.trim();
    if (!text) return setSendError("Please type a message before sending.");
    try {
      setSending(true);
      setSendError("");
      const now = new Date().toISOString();
      const optimisticMessage: Message = {
        id: `local-${Date.now()}`,
        contact_phone: selectedContact.phone,
        whatsapp_message_id: null,
        role: "manual",
        direction: "outbound",
        message_type: "text",
        content: text,
        created_at: now,
        delivery_status: "sent",
      };
      setMessages((previous) => [...previous, optimisticMessage]);
      setContacts((previous) =>
        previous.map((contact) =>
          contact.phone === selectedContact.phone
            ? { ...contact, last_message: text, last_message_at: now }
            : contact
        )
      );
      setManualReply("");
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: cleanPhone(selectedContact.phone), message: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
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

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendManualReply();
    }
  }

  async function updateAiEnabled(nextValue: boolean) {
    if (!selectedContact) return;
    setAiToggleSaving(true);
    setLocalAiEnabled(nextValue);
    setContacts((previous) =>
      previous.map((contact) =>
        contact.phone === selectedContact.phone ? { ...contact, ai_enabled: nextValue } : contact
      )
    );
    const ok = await updateContactForPhone(selectedContact.phone, { ai_enabled: nextValue });
    if (!ok) setSendError("Could not save AI status. Check /api/inbox/contact.");
    setAiToggleSaving(false);
  }

  function togglePinned(contact: Contact) {
    const next = !isPinned(contact);
    setLocalPinnedMap((previous) => ({ ...previous, [contact.phone]: next }));
    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone ? { ...item, is_starred: next, pinned: next } : item
      )
    );
    void updateContactForPhone(contact.phone, { is_starred: next, pinned: next });
  }

  function markHumanHandled(contact: Contact) {
    const now = String(Date.now());
    setLocalHandledMap((previous) => ({ ...previous, [contact.phone]: now }));
    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone ? { ...item, needs_human_attention: false, human_attention: false } : item
      )
    );
    void updateContactForPhone(contact.phone, { needs_human_attention: false, human_attention: false });
    setLocalNotice("Human attention cleared.");
  }

  function muteContact(contact: Contact, hours: number) {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setLocalMutedMap((previous) => ({ ...previous, [contact.phone]: until }));
    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone ? { ...item, is_muted: true, muted_until: until } : item
      )
    );
    void updateContactForPhone(contact.phone, { is_muted: true, muted_until: until });
    setLocalNotice(`Muted for ${hours} hour${hours === 1 ? "" : "s"}.`);
    setMoreMenuOpen(false);
  }

  function unmuteContact(contact: Contact) {
    setLocalMutedMap((previous) => ({ ...previous, [contact.phone]: null }));
    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone ? { ...item, is_muted: false, muted_until: null } : item
      )
    );
    void updateContactForPhone(contact.phone, { is_muted: false, muted_until: null });
    setLocalNotice("Notifications unmuted.");
    setMoreMenuOpen(false);
  }

  function setBlocked(contact: Contact, next: boolean) {
    setLocalBlockedMap((previous) => ({ ...previous, [contact.phone]: next }));
    setContacts((previous) =>
      previous.map((item) =>
        item.phone === contact.phone
          ? {
              ...item,
              is_blocked: next,
              blocked: next,
              conversation_status: next ? "blocked" : "open",
              ai_enabled: next ? false : item.ai_enabled,
            }
          : item
      )
    );
    void updateContactForPhone(contact.phone, {
      is_blocked: next,
      blocked: next,
      conversation_status: next ? "blocked" : "open",
      ai_enabled: next ? false : undefined,
    });
    setLocalNotice(next ? "Contact blocked." : "Contact unblocked.");
    setMoreMenuOpen(false);
  }

  async function deleteSelectedChat() {
    if (!selectedContact) return;
    const confirmed = window.confirm(`Delete chat with ${displayName(selectedContact)}?`);
    if (!confirmed) return;
    try {
      await fetch("/api/inbox/delete-chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone(selectedContact.phone) }),
      });
    } catch {
      setLocalNotice("Delete API not ready. Chat hidden locally.");
    }
    setContacts((previous) => previous.filter((contact) => contact.phone !== selectedContact.phone));
    setMessages((previous) => previous.filter((message) => message.contact_phone !== selectedContact.phone));
    setSelectedPhone(null);
    selectedPhoneRef.current = null;
    setMobileChatOpen(false);
  }

  async function generateAiSuggestion() {
    if (!selectedContact) return setSendError("Select a chat first.");
    try {
      setLocalNotice("Generating AI suggestion...");
      const res = await fetch("/api/inbox/ai-suggestion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone(selectedContact.phone),
          latestMessage: selectedContact.last_message || "",
        }),
      });
      const data = await res.json().catch(() => null);
      const fallback = selectedContact.last_message
        ? "Thank you for your message. I'll check this and get back to you shortly."
        : "Hello, thank you for contacting us. How can I help you today?";
      setManualReply(data?.suggestion ? String(data.suggestion) : fallback);
      setLocalNotice(data?.suggestion ? "AI suggestion added." : "AI suggestion API not ready, safe reply added.");
    } catch {
      setManualReply("Thank you for your message. I'll check this and get back to you shortly.");
      setLocalNotice("AI suggestion API not ready, safe reply added.");
    }
  }

  const translateMessage = useCallback(
    async (message: Message, force = false) => {
      if (!canTranslateMessage(message)) return;
      const target = translationTargetRef.current || "English";
      const key = `${message.id}:${target}`;

      if (
        !force &&
        message.translated_text &&
        (!message.translated_language ||
          message.translated_language.toLowerCase().includes(target.toLowerCase().slice(0, 3)))
      ) {
        setTranslations((previous) => ({
          ...previous,
          [key]: {
            translatedText: String(message.translated_text),
            detectedLanguage: String(message.translated_language || "Unknown"),
            targetLanguage: target,
          },
        }));
        return;
      }

      if (!force && translations[key]) return;
      if (translatingMap[key]) return;
      try {
        setTranslatingMap((previous) => ({ ...previous, [key]: true }));
        const res = await fetch("/api/inbox/translate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: message.id,
            text: message.content || "",
            targetLanguage: target,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.translatedText) {
          setTranslations((previous) => ({
            ...previous,
            [key]: {
              translatedText: String(data.translatedText),
              detectedLanguage: String(data.detectedLanguage || "Unknown"),
              targetLanguage: String(data.targetLanguage || target),
            },
          }));
        }
      } catch (error) {
        console.error("Translate error:", error);
      } finally {
        setTranslatingMap((previous) => ({ ...previous, [key]: false }));
      }
    },
    [translatingMap, translations]
  );

  useEffect(() => {
    selectedMessages.forEach((message) => {
      if (canTranslateMessage(message)) void translateMessage(message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhone, selectedMessages.length, translationTarget]);

  async function uploadMediaFile(file: File) {
    if (!selectedContact) return;
    try {
      setSending(true);
      setSendError("");
      const form = new FormData();
      form.append("file", file);
      form.append("to", cleanPhone(selectedContact.phone));
      const res = await fetch("/api/media/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSendError(data?.error || "Media upload failed.");
        return;
      }
      setLocalNotice("Media sent.");
      await loadInbox(true);
    } catch {
      setSendError("Media upload failed.");
    } finally {
      setSending(false);
    }
  }

  function handleDocumentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadMediaFile(file);
    event.target.value = "";
  }

  function handleMediaUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadMediaFile(file);
    event.target.value = "";
  }

  async function deleteMessage(message: Message, mode: "me" | "everyone") {
    try {
      const res = await fetch(`/api/messages/${message.id}/delete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSendError(data?.error || "Could not delete message.");
        return;
      }
      if (mode === "everyone" && data?.warning) {
        setLocalNotice(String(data.warning));
      }
      if (mode === "me") {
        setMessages((previous) => previous.filter((item) => item.id !== message.id));
      } else {
        setMessages((previous) =>
          previous.map((item) =>
            item.id === message.id
              ? {
                  ...item,
                  deleted_for_everyone: true,
                  content: "This message was deleted.",
                }
              : item
          )
        );
      }
    } catch {
      setSendError("Could not delete message.");
    }
  }

  function replyToMessage(message: Message) {
    const snippet = String(message.content || "").trim();
    if (!snippet) return;
    setManualReply((previous) => (previous ? `${previous}\n> ${snippet}` : `> ${snippet}`));
  }

  function copyMessage(message: Message) {
    const text = String(message.content || "").trim();
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setLocalNotice("Message copied.");
  }

  async function markAllAsRead() {
    setContacts((previous) => previous.map((contact) => ({ ...contact, unread_count: 0 })));
    setChatListMenuOpen(false);
    setLocalNotice("All chats marked as read.");
    for (const contact of contacts) await markChatAsRead(contact.phone);
  }

  function closeMobileChat() {
    setMobileChatOpen(false);
    setMoreMenuOpen(false);
  }

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  return {
    contacts,
    selectedContact,
    selectedPhone,
    selectedMessages,
    mobileChatOpen,
    searchValue,
    setSearchValue,
    mobileFilter,
    setMobileFilter,
    theme,
    isDark,
    toggleTheme,
    loading,
    loadError,
    manualReply,
    setManualReply,
    sending,
    sendError,
    localAiEnabled,
    aiToggleSaving,
    emojiOpen,
    setEmojiOpen,
    moreMenuOpen,
    setMoreMenuOpen,
    chatListMenuOpen,
    setChatListMenuOpen,
    notificationsOpen,
    setNotificationsOpen,
    localNotice,
    setLocalNotice,
    translationTarget,
    setTranslationTarget,
    translations,
    translatingMap,
    userEmail,
    userAvatarUrl,
    unreadCount,
    favoritesCount,
    humanCount,
    filteredContacts,
    messagesEndRef,
    documentInputRef,
    mediaInputRef,
    isPinned,
    isBlocked,
    isMuted,
    needsHuman,
    handleSelectContact,
    closeMobileChat,
    sendManualReply,
    handleTextareaKeyDown,
    updateAiEnabled,
    togglePinned,
    markHumanHandled,
    muteContact,
    unmuteContact,
    setBlocked,
    deleteSelectedChat,
    generateAiSuggestion,
    translateMessage,
    handleDocumentUpload,
    handleMediaUpload,
    deleteMessage,
    replyToMessage,
    copyMessage,
    markAllAsRead,
  };
}
