"use client";

import { Suspense } from "react";
import ChatListSidebar from "@/components/inbox/ChatListSidebar";
import ChatPanel from "@/components/inbox/ChatPanel";
import DesktopNavRail from "@/components/inbox/DesktopNavRail";
import EmptyChatState from "@/components/inbox/EmptyChatState";
import MobileBottomNav from "@/components/inbox/MobileBottomNav";
import { useInbox } from "@/hooks/useInbox";
import { cx } from "@/lib/inbox/helpers";

function InboxPageContent() {
  const inbox = useInbox();

  const showListOnMobile = !inbox.mobileChatOpen;
  const showChatOnMobile = inbox.mobileChatOpen;

  const sidebarProps = {
    isDark: inbox.isDark,
    userEmail: inbox.userEmail,
    userAvatarUrl: inbox.userAvatarUrl,
    searchValue: inbox.searchValue,
    onSearchChange: inbox.setSearchValue,
    mobileFilter: inbox.mobileFilter,
    onFilterChange: inbox.setMobileFilter,
    contactsCount: inbox.contacts.length,
    unreadCount: inbox.unreadCount,
    favoritesCount: inbox.favoritesCount,
    humanCount: inbox.humanCount,
    loading: inbox.loading,
    loadError: inbox.loadError,
    localNotice: inbox.localNotice,
    notificationsOpen: inbox.notificationsOpen,
    onNotificationsOpen: inbox.setNotificationsOpen,
    chatListMenuOpen: inbox.chatListMenuOpen,
    onChatListMenuOpen: inbox.setChatListMenuOpen,
    onToggleTheme: inbox.toggleTheme,
    onMarkAllRead: () => void inbox.markAllAsRead(),
    filteredContacts: inbox.filteredContacts,
    selectedPhone: inbox.selectedPhone,
    onSelectContact: inbox.handleSelectContact,
    isPinned: inbox.isPinned,
    isMuted: inbox.isMuted,
    isBlocked: inbox.isBlocked,
    needsHuman: inbox.needsHuman,
  };

  return (
    <main
      className={cx(
        "h-[100dvh] w-full overflow-hidden",
        inbox.isDark ? "bg-[#0B141A]" : "bg-[#D1D7DB]"
      )}
    >
      <div className="hidden h-full md:flex">
        <DesktopNavRail
          unreadCount={inbox.unreadCount}
          isDark={inbox.isDark}
          userAvatarUrl={inbox.userAvatarUrl}
          onToggleTheme={inbox.toggleTheme}
          onOpenNotifications={() => inbox.setNotificationsOpen(true)}
        />
        <div className="mx-auto flex h-full w-full max-w-[1600px] overflow-hidden bg-white shadow-[0_8px_32px_rgba(11,20,26,0.12)]">
          <ChatListSidebar visible {...sidebarProps} />
          {inbox.selectedContact ? (
            <ChatPanel
              visible
              contact={inbox.selectedContact}
              messages={inbox.selectedMessages}
              messagesEndRef={inbox.messagesEndRef}
              onBack={inbox.closeMobileChat}
              isPinned={inbox.isPinned}
              isBlocked={inbox.isBlocked}
              isMuted={inbox.isMuted}
              needsHuman={inbox.needsHuman}
              localAiEnabled={inbox.localAiEnabled}
              aiToggleSaving={inbox.aiToggleSaving}
              onToggleAi={(enabled) => void inbox.updateAiEnabled(enabled)}
              onGenerateSuggestion={() => void inbox.generateAiSuggestion()}
              moreMenuOpen={inbox.moreMenuOpen}
              onMoreMenuOpen={inbox.setMoreMenuOpen}
              onTogglePinned={inbox.togglePinned}
              onMarkHumanHandled={inbox.markHumanHandled}
              onMute={inbox.muteContact}
              onUnmute={inbox.unmuteContact}
              onSetBlocked={inbox.setBlocked}
              onDeleteChat={() => void inbox.deleteSelectedChat()}
              translationTarget={inbox.translationTarget}
              onTranslationTargetChange={inbox.setTranslationTarget}
              translations={inbox.translations}
              translatingMap={inbox.translatingMap}
              onTranslate={(message) => void inbox.translateMessage(message, true)}
              manualReply={inbox.manualReply}
              onManualReplyChange={inbox.setManualReply}
              onSend={() => void inbox.sendManualReply()}
              onTextareaKeyDown={inbox.handleTextareaKeyDown}
              sending={inbox.sending}
              sendError={inbox.sendError}
              emojiOpen={inbox.emojiOpen}
              onEmojiOpen={inbox.setEmojiOpen}
              documentInputRef={inbox.documentInputRef}
              mediaInputRef={inbox.mediaInputRef}
              onDocumentUpload={inbox.handleDocumentUpload}
              onMediaUpload={inbox.handleMediaUpload}
              onVoiceNotice={() => inbox.setLocalNotice("Voice messages can be connected in the media backend step.")}
              onReplyMessage={inbox.replyToMessage}
              onCopyMessage={inbox.copyMessage}
              onDeleteForMe={(message) => void inbox.deleteMessage(message, "me")}
              onDeleteForEveryone={(message) => void inbox.deleteMessage(message, "everyone")}
            />
          ) : (
            <EmptyChatState />
          )}
        </div>
      </div>

      <div className="flex h-full flex-col overflow-hidden bg-white md:hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ChatListSidebar visible={showListOnMobile} {...sidebarProps} />
          {inbox.selectedContact ? (
            <ChatPanel
              visible={showChatOnMobile}
              contact={inbox.selectedContact}
              messages={inbox.selectedMessages}
              messagesEndRef={inbox.messagesEndRef}
              onBack={inbox.closeMobileChat}
              isPinned={inbox.isPinned}
              isBlocked={inbox.isBlocked}
              isMuted={inbox.isMuted}
              needsHuman={inbox.needsHuman}
              localAiEnabled={inbox.localAiEnabled}
              aiToggleSaving={inbox.aiToggleSaving}
              onToggleAi={(enabled) => void inbox.updateAiEnabled(enabled)}
              onGenerateSuggestion={() => void inbox.generateAiSuggestion()}
              moreMenuOpen={inbox.moreMenuOpen}
              onMoreMenuOpen={inbox.setMoreMenuOpen}
              onTogglePinned={inbox.togglePinned}
              onMarkHumanHandled={inbox.markHumanHandled}
              onMute={inbox.muteContact}
              onUnmute={inbox.unmuteContact}
              onSetBlocked={inbox.setBlocked}
              onDeleteChat={() => void inbox.deleteSelectedChat()}
              translationTarget={inbox.translationTarget}
              onTranslationTargetChange={inbox.setTranslationTarget}
              translations={inbox.translations}
              translatingMap={inbox.translatingMap}
              onTranslate={(message) => void inbox.translateMessage(message, true)}
              manualReply={inbox.manualReply}
              onManualReplyChange={inbox.setManualReply}
              onSend={() => void inbox.sendManualReply()}
              onTextareaKeyDown={inbox.handleTextareaKeyDown}
              sending={inbox.sending}
              sendError={inbox.sendError}
              emojiOpen={inbox.emojiOpen}
              onEmojiOpen={inbox.setEmojiOpen}
              documentInputRef={inbox.documentInputRef}
              mediaInputRef={inbox.mediaInputRef}
              onDocumentUpload={inbox.handleDocumentUpload}
              onMediaUpload={inbox.handleMediaUpload}
              onVoiceNotice={() => inbox.setLocalNotice("Voice messages can be connected in the media backend step.")}
              onReplyMessage={inbox.replyToMessage}
              onCopyMessage={inbox.copyMessage}
              onDeleteForMe={(message) => void inbox.deleteMessage(message, "me")}
              onDeleteForEveryone={(message) => void inbox.deleteMessage(message, "everyone")}
            />
          ) : showListOnMobile ? null : (
            <div className="flex h-full items-center justify-center bg-[#F8F9FA] px-6 text-center text-sm text-[#667781]">
              Select a conversation from your chat list.
            </div>
          )}
        </div>
        {showListOnMobile ? <MobileBottomNav /> : null}
      </div>
    </main>
  );
}

export default function InboxChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-[#F0F2F5] text-sm text-[#667781]">
          Loading inbox…
        </div>
      }
    >
      <InboxPageContent />
    </Suspense>
  );
}
