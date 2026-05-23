export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-400">PRIVATE INBOX</p>
        <h1 className="mt-2 text-3xl font-bold text-white">WhatsApp Inbox</h1>
        <p className="mt-2 text-slate-400">
          Your private WhatsApp AI chat dashboard is loading correctly.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white">Chats</h2>
          <p className="mt-2 text-sm text-slate-400">
            No conversations loaded yet. WhatsApp chats will appear here.
          </p>
        </aside>

        <section className="min-h-[500px] rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white">Select a conversation</h2>
          <p className="mt-2 text-sm text-slate-400">
            Once a customer messages your WhatsApp number, you will see the chat here.
          </p>
        </section>
      </div>
    </div>
  );
}
