"use client";

import { Suspense } from "react";
import ChatListSidebar from "@/components/inbox/ChatListSidebar";
import ChatPanel from "@/components/inbox/ChatPanel";
import { useInbox } from "@/hooks/useInbox";

function InboxInner() {
  const inbox = useInbox();

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[480px] overflow-hidden rounded-xl border border-white/10 md:h-[calc(100vh-2rem)]">
      <ChatListSidebar
        visible={!inbox.mobileChatOpen}
        isDark={inbox.isDark}
        userEmail={inbox.userEmail}
        userAvatarUrl={inbox.userAvatarUrl}
        searchValue={inbox.searchValue}
        onSearchChange={inbox.setSearchValue}
        mobileFilter={inbox.mobileFilter}
        onFilterChange={inbox.setMobileFilter}
        contactsCount={inbox.contacts.length}
        unreadCount={inbox.unreadCount}
        favoritesCount={inbox.favoritesCount}
        humanCount={inbox.humanCount}
        loading={inbox.loading}
        loadError={inbox.loadError}
        localNotice={inbox.localNotice}
        notificationsOpen={inbox.notificationsOpen}
        onNotificationsOpen={inbox.setNotificationsOpen}
        chatListMenuOpen={inbox.chatListMenuOpen}
        onChatListMenuOpen={inbox.setChatListMenuOpen}
        onToggleTheme={inbox.toggleTheme}
        onMarkAllRead={() => void inbox.markAllAsRead()}
        filteredContacts={inbox.filteredContacts}
        selectedPhone={inbox.selectedPhone}
        onSelectContact={inbox.handleSelectContact}
        isPinned={inbox.isPinned}
        isMuted={inbox.isMuted}
        isBlocked={inbox.isBlocked}
        needsHuman={inbox.needsHuman}
      />

      {inbox.selectedContact ? (
        <ChatPanel
          visible={inbox.mobileChatOpen}
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
          onTranslate={(message) => void inbox.translateMessage(message)}
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
          onVoiceNotice={() =>
            inbox.setLocalNotice("Voice messages: upload as audio file from attach menu.")
          }
          onReplyMessage={inbox.replyToMessage}
          onCopyMessage={inbox.copyMessage}
          onDeleteForMe={(message) => void inbox.deleteMessage(message, "me")}
          onDeleteForEveryone={(message) =>
            void inbox.deleteMessage(message, "everyone")
          }
        />
      ) : (
        <div className="hidden min-w-0 flex-1 items-center justify-center bg-[#0B141A] text-[#8696A0] md:flex">
          Select a conversation
        </div>
      )}
    </div>
  );
}

export default function PrivateFullInbox() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-[#8696A0]">
          Loading inbox…
        </div>
      }
    >
      <InboxInner />
    </Suspense>
  );
}
