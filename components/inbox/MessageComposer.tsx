"use client";

import { useEffect, useRef, useState } from "react";

type QuickReply = {
  id: string;
  title: string;
  content: string;
};

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanText = text.trim();
  const canSend = !disabled && !sending && cleanText.length > 0;

  useEffect(() => {
    if (disabled) {
      setShowQuickReplies(false);
      setError(null);
    }
  }, [disabled]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 130)}px`;
  }, [text]);

  async function handleSend() {
    if (!canSend) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await onSend(cleanText);
      setText("");
      setShowQuickReplies(false);
    } catch (error) {
      console.error("Message send failed:", error);
      setError(error instanceof Error ? error.message : "Message send failed.");
    } finally {
      setSending(false);
    }
  }

  async function handleSuggest() {
    if (disabled || suggesting) {
      return;
    }

    setSuggesting(true);
    setError(null);

    try {
      const suggestion = await onAiSuggest();

      if (suggestion && suggestion.trim()) {
        setText(suggestion.trim());
        setShowQuickReplies(false);

        window.setTimeout(() => {
          textareaRef.current?.focus();
        }, 50);
      } else {
        setError("AI did not return a suggestion.");
      }
    } catch (error) {
      console.error("AI suggestion failed:", error);
      setError(
        error instanceof Error ? error.message : "AI suggestion failed."
      );
    } finally {
      setSuggesting(false);
    }
  }

  function applyQuickReply(reply: QuickReply) {
    setText(reply.content);
    setShowQuickReplies(false);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  return (
    <div className="border-t border-white/10 bg-[#202c33] px-3 py-3">
      {error ? (
        <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">
          {error}
        </div>
      ) : null}

      {showQuickReplies ? (
        <div className="mb-3 max-h-44 overflow-y-auto rounded-2xl border border-white/10 bg-[#111b21] p-2 shadow-2xl shadow-black/20">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-black uppercase tracking-wide text-[#8696a0]">
              Quick replies
            </p>

            <button
              type="button"
              onClick={() => setShowQuickReplies(false)}
              className="rounded-full px-2 py-1 text-xs font-bold text-[#8696a0] hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>

          {quickReplies.length === 0 ? (
            <div className="rounded-xl bg-white/[0.04] px-3 py-4 text-center">
              <p className="text-xs text-[#8696a0]">
                No quick replies yet. Add quick replies from your dashboard
                settings later.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => applyQuickReply(reply)}
                  className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06] active:bg-white/[0.08]"
                >
                  <span className="block truncate text-sm font-bold text-white">
                    {reply.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs leading-5 text-[#8696a0]">
                    {reply.content}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled={disabled}
          title="Quick replies"
          onClick={() => setShowQuickReplies((value) => !value)}
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lg text-[#8696a0] transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⚡
        </button>

        <div className="min-w-0 flex-1 rounded-3xl bg-[#111b21] px-4 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={disabled || sending}
            placeholder={
              disabled
                ? "Select a chat to reply"
                : suggesting
                  ? "Generating AI suggestion..."
                  : "Type a message"
            }
            rows={1}
            className="max-h-32 min-h-[28px] w-full resize-none bg-transparent py-1 text-sm leading-6 text-white outline-none placeholder:text-[#8696a0] disabled:cursor-not-allowed"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
        </div>

        <button
          type="button"
          disabled={disabled || suggesting}
          onClick={() => void handleSuggest()}
          title="Generate AI reply"
          className="mb-0.5 hidden h-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] px-4 text-xs font-black text-[#8696a0] transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
        >
          {suggesting ? "AI..." : "AI"}
        </button>

        <button
          type="button"
          disabled={disabled || suggesting}
          onClick={() => void handleSuggest()}
          title="Generate AI reply"
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-black text-[#8696a0] transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:hidden"
        >
          {suggesting ? "…" : "AI"}
        </button>

        <button
          type="button"
          disabled={!canSend}
          onClick={() => void handleSend()}
          className="mb-0.5 flex h-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] px-5 text-sm font-black text-black transition hover:bg-[#06cf9c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[10px] text-[#8696a0]">
          Enter to send · Shift + Enter for new line
        </p>

        {text.length > 0 ? (
          <p className="text-[10px] text-[#8696a0]">{text.length} chars</p>
        ) : null}
      </div>
    </div>
  );
}