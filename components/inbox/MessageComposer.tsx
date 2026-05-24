"use client";

import { useState } from "react";

type QuickReply = { id: string; title: string; content: string };

export default function MessageComposer({
  disabled,
  quickReplies,
  onSend,
  onAiSuggest,
}: {
  disabled: boolean;
  quickReplies: QuickReply[];
  onSend: (body: string) => Promise<void>;
  onAiSuggest: () => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const body = text.trim();
    if (!body || disabled || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function handleSuggest() {
    setError(null);
    try {
      const suggestion = await onAiSuggest();
      if (suggestion) setText(suggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI suggestion failed");
    }
  }

  return (
    <div className="border-t border-white/10 bg-[#111B21] p-3">
      {error ? (
        <p className="mb-2 text-xs text-red-300">{error}</p>
      ) : null}

      {showQuick ? (
        <div className="mb-2 max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-[#0B141A] p-2">
          {quickReplies.length === 0 ? (
            <p className="text-xs text-[#8696A0]">No quick replies yet.</p>
          ) : (
            quickReplies.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setText(q.content);
                  setShowQuick(false);
                }}
                className="mb-1 block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/5"
              >
                <span className="font-medium text-white">{q.title}</span>
                <span className="mt-0.5 block truncate text-[#8696A0]">
                  {q.content}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled={disabled}
          title="Attachments (coming soon)"
          className="rounded-lg px-2 py-2 text-xs text-[#8696A0] opacity-40"
        >
          📎
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || sending}
          placeholder={disabled ? "Select a chat" : "Type a message"}
          rows={2}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm text-white outline-none focus:border-[#00A884]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowQuick((v) => !v)}
            className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-[#8696A0] hover:bg-white/10"
          >
            Quick
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void handleSuggest()}
            className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-[#8696A0] hover:bg-white/10"
          >
            AI
          </button>
          <button
            type="button"
            disabled={disabled || sending || !text.trim()}
            onClick={() => void handleSend()}
            className="rounded-lg bg-[#00A884] px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
