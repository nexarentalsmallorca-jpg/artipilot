import InboxIcon from "./InboxIcon";

export default function EmptyChatState() {
  return (
    <div className="hidden min-h-0 flex-1 flex-col items-center justify-center border-l border-[#E9EDEF] bg-[#F8F9FA] px-8 text-center md:flex">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#E7FCEB] text-[#008069]">
        <InboxIcon name="inbox" className="h-12 w-12" />
      </div>
      <h2 className="text-[28px] font-light tracking-tight text-[#41525D]">Artipilot Business Inbox</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#667781]">
        Manage WhatsApp conversations, AI replies, and your team handoffs from one familiar chat workspace.
      </p>
      <p className="mt-6 text-xs text-[#8696A0]">Select a conversation to start messaging</p>
    </div>
  );
}
