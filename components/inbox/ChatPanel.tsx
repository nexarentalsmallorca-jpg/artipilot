"use client";

import { RefObject } from "react";
import { QUICK_EMOJIS, TRANSLATION_LANGUAGES, cx, displayName, formatLastSeen, groupMessagesByDate } from "@/lib/inbox/helpers";
import type { Contact, Message, TranslationResult } from "@/lib/inbox/types";
import ChatWallpaper from "./ChatWallpaper";
import ContactAvatar from "./ContactAvatar";
import InboxIcon from "./InboxIcon";
import MessageBubble, { DateDivider } from "./MessageBubble";

type ChatPanelProps = {
  visible: boolean;
  contact: Contact;
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onBack: () => void;
  isPinned: (contact: Contact) => boolean;
  isBlocked: (contact: Contact) => boolean;
  isMuted: (contact: Contact) => boolean;
  needsHuman: (contact: Contact) => boolean;
  localAiEnabled: boolean;
  aiToggleSaving: boolean;
  onToggleAi: (enabled: boolean) => void;
  onGenerateSuggestion: () => void;
  moreMenuOpen: boolean;
  onMoreMenuOpen: (open: boolean) => void;
  onTogglePinned: (contact: Contact) => void;
  onMarkHumanHandled: (contact: Contact) => void;
  onMute: (contact: Contact, hours: number) => void;
  onUnmute: (contact: Contact) => void;
  onSetBlocked: (contact: Contact, blocked: boolean) => void;
  onDeleteChat: () => void;
  translationTarget: string;
  onTranslationTargetChange: (value: string) => void;
  translations: Record<string, TranslationResult>;
  translatingMap: Record<string, boolean>;
  onTranslate: (message: Message) => void;
  manualReply: string;
  onManualReplyChange: (value: string) => void;
  onSend: () => void;
  onTextareaKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  sending: boolean;
  sendError: string;
  emojiOpen: boolean;
  onEmojiOpen: (open: boolean) => void;
  documentInputRef: RefObject<HTMLInputElement | null>;
  mediaInputRef: RefObject<HTMLInputElement | null>;
  onDocumentUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMediaUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceNotice: () => void;
  onReplyMessage: (message: Message) => void;
  onCopyMessage: (message: Message) => void;
  onDeleteForMe: (message: Message) => void;
  onDeleteForEveryone: (message: Message) => void;
};

export default function ChatPanel({
  visible,
  contact,
  messages,
  messagesEndRef,
  onBack,
  isPinned,
  isBlocked,
  isMuted,
  needsHuman,
  localAiEnabled,
  aiToggleSaving,
  onToggleAi,
  onGenerateSuggestion,
  moreMenuOpen,
  onMoreMenuOpen,
  onTogglePinned,
  onMarkHumanHandled,
  onMute,
  onUnmute,
  onSetBlocked,
  onDeleteChat,
  translationTarget,
  onTranslationTargetChange,
  translations,
  translatingMap,
  onTranslate,
  manualReply,
  onManualReplyChange,
  onSend,
  onTextareaKeyDown,
  sending,
  sendError,
  emojiOpen,
  onEmojiOpen,
  documentInputRef,
  mediaInputRef,
  onDocumentUpload,
  onMediaUpload,
  onVoiceNotice,
  onReplyMessage,
  onCopyMessage,
  onDeleteForMe,
  onDeleteForEveryone,
}: ChatPanelProps) {
  const human = needsHuman(contact);
  const blocked = isBlocked(contact);
  const muted = isMuted(contact);
  const messageGroups = groupMessagesByDate(messages);
  const statusText = blocked
    ? "blocked"
    : muted
      ? "notifications muted"
      : localAiEnabled
        ? `AI active · ${formatLastSeen(contact.last_message_at)}`
        : `manual mode · ${formatLastSeen(contact.last_message_at)}`;

  return (
    <section
      className={cx(
        "relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#EFEAE2]",
        visible
          ? "absolute inset-0 z-20 flex h-full md:relative md:inset-auto md:z-auto md:flex md:h-full md:flex-1"
          : "hidden md:flex md:h-full md:flex-1"
      )}
    >
      {/* Conversation header */}
      <header className="z-20 flex h-[60px] shrink-0 items-center justify-between bg-[#F0F2F5] px-3 shadow-sm md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 rounded-full p-1.5 text-[#54656F] transition hover:bg-black/5 md:hidden"
            aria-label="Back to chats"
          >
            <InboxIcon name="back" className="h-6 w-6" />
          </button>
          <ContactAvatar contact={contact} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[16px] font-semibold text-[#111B21]">{displayName(contact)}</h2>
              {human ? (
                <span className="shrink-0 rounded-full bg-[#FFECDC] px-2 py-0.5 text-[10px] font-bold text-[#C76A00]">
                  Human
                </span>
              ) : null}
            </div>
            <p className="truncate text-[13px] text-[#667781]">{statusText}</p>
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-1 text-[#54656F] md:gap-2">
          <button type="button" className="hidden rounded-full p-2 hover:bg-black/5 md:block" aria-label="Video call">
            <InboxIcon name="video" />
          </button>
          <button type="button" className="hidden rounded-full p-2 hover:bg-black/5 md:block" aria-label="Voice call">
            <InboxIcon name="phone" />
          </button>
          <button type="button" className="rounded-full p-2 hover:bg-black/5" aria-label="Search in chat">
            <InboxIcon name="search" />
          </button>
          <button
            type="button"
            onClick={() => onMoreMenuOpen(!moreMenuOpen)}
            className="rounded-full p-2 hover:bg-black/5"
            aria-label="Chat options"
          >
            <InboxIcon name="dots" />
          </button>
          {moreMenuOpen ? (
            <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-lg bg-white py-1 text-sm text-[#111B21] shadow-lg ring-1 ring-black/5">
              <button type="button" onClick={() => onTogglePinned(contact)} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                {isPinned(contact) ? "Remove from favorites" : "Add to favorites"}
              </button>
              {human ? (
                <button type="button" onClick={() => onMarkHumanHandled(contact)} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                  Mark human issue handled
                </button>
              ) : null}
              {muted ? (
                <button type="button" onClick={() => onUnmute(contact)} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                  Unmute notifications
                </button>
              ) : (
                <button type="button" onClick={() => onMute(contact, 8)} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                  Mute for 8 hours
                </button>
              )}
              <button type="button" onClick={() => onSetBlocked(contact, !blocked)} className="block w-full px-4 py-2.5 text-left hover:bg-[#F5F6F6]">
                {blocked ? "Unblock contact" : "Block contact"}
              </button>
              <button type="button" onClick={() => void onDeleteChat()} className="block w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50">
                Delete chat
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {human ? (
        <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[#F0E1C1] bg-[#FFF7DF] px-4 py-2 text-xs text-[#7A4F00]">
          <span>This chat may need a real person. Pause AI while your team replies.</span>
          <button
            type="button"
            onClick={() => onMarkHumanHandled(contact)}
            className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#008069] shadow-sm"
          >
            Handled
          </button>
        </div>
      ) : null}

      {/* Messages */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 md:px-12 md:py-4">
        <ChatWallpaper />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-1">
          {messageGroups.length === 0 ? (
            <div className="flex justify-center py-8">
              <span className="rounded-lg bg-white/90 px-3 py-1.5 text-sm text-[#667781]">No messages yet. Say hello!</span>
            </div>
          ) : (
            messageGroups.map((group) => (
              <div key={group.label}>
                <DateDivider label={group.label} />
                {group.messages.map((message) => {
                  const key = `${message.id}:${translationTarget}`;
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      translation={translations[key]}
                      isTranslating={translatingMap[key]}
                      onTranslate={() => onTranslate(message)}
                      onReply={() => onReplyMessage(message)}
                      onCopy={() => onCopyMessage(message)}
                      onDeleteForMe={() => onDeleteForMe(message)}
                      onDeleteForEveryone={() => onDeleteForEveryone(message)}
                    />
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Composer */}
      <footer className="z-20 shrink-0 border-t border-[#E9EDEF] bg-[#F0F2F5] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleAi(!localAiEnabled)}
              disabled={aiToggleSaving || blocked}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                localAiEnabled && !blocked ? "bg-[#D9FDD3] text-[#008069]" : "bg-white text-[#667781] shadow-sm"
              )}
            >
              {aiToggleSaving ? "Saving…" : localAiEnabled && !blocked ? "AI ON" : "AI OFF"}
            </button>
            <button
              type="button"
              onClick={() => void onGenerateSuggestion()}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#008069] shadow-sm transition hover:bg-[#E7FCEB]"
            >
              AI suggestion
            </button>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[#667781]">
            Translate to
            <select
              value={translationTarget}
              onChange={(event) => onTranslationTargetChange(event.target.value)}
              className="rounded-full border border-[#D1D7DB] bg-white px-2 py-1 text-xs outline-none"
            >
              {TRANSLATION_LANGUAGES.map((language) => (
                <option key={language}>{language}</option>
              ))}
            </select>
          </label>
        </div>

        {sendError ? (
          <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{sendError}</div>
        ) : null}

        {emojiOpen ? (
          <div className="mb-2 flex flex-wrap gap-1.5 rounded-xl bg-white p-2 shadow-sm">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onManualReplyChange(`${manualReply}${emoji}`)}
                className="rounded-lg px-1.5 py-0.5 text-xl transition hover:bg-[#F0F2F5]"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => onEmojiOpen(!emojiOpen)}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5"
            aria-label="Emoji"
          >
            <InboxIcon name="emoji" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => documentInputRef.current?.click()}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5"
            aria-label="Attach file"
          >
            <InboxIcon name="attach" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="mb-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 md:flex"
            aria-label="Attach media"
          >
            <InboxIcon name="camera" className="h-6 w-6" />
          </button>
          <textarea
            value={manualReply}
            onChange={(event) => onManualReplyChange(event.target.value)}
            onKeyDown={onTextareaKeyDown}
            placeholder={blocked ? "This contact is blocked" : "Type a message"}
            disabled={blocked}
            rows={1}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-lg bg-white px-4 py-2.5 text-[15px] leading-5 text-[#111B21] outline-none ring-1 ring-transparent placeholder:text-[#8696A0] focus:ring-[#008069]/30 disabled:cursor-not-allowed disabled:bg-[#E9EDEF]"
          />
          <button
            type="button"
            onClick={() => (manualReply.trim() ? void onSend() : onVoiceNotice())}
            disabled={sending || blocked}
            className={cx(
              "mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50",
              manualReply.trim() ? "bg-[#008069] text-white hover:bg-[#006B57]" : "text-[#54656F] hover:bg-black/5"
            )}
            aria-label={manualReply.trim() ? "Send message" : "Voice message"}
          >
            <InboxIcon name={manualReply.trim() ? "send" : "mic"} className="h-5 w-5" />
          </button>
          <input ref={documentInputRef} type="file" className="hidden" onChange={onDocumentUpload} />
          <input ref={mediaInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={onMediaUpload} />
        </div>
      </footer>
    </section>
  );
}
