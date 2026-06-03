"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type QuickReply = {
  id: string;
  title: string;
  content: string;
};

type SelectedAttachment = {
  file: File;
  type: "image" | "video" | "audio" | "document";
  previewUrl: string | null;
};

function detectAttachmentType(file: File): SelectedAttachment["type"] {
  const mimeType = (file.type || "").toLowerCase();
  const fileName = (file.name || "").toLowerCase();

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  if (
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".webp") ||
    fileName.endsWith(".gif")
  ) {
    return "image";
  }

  if (
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".mov") ||
    fileName.endsWith(".m4v") ||
    fileName.endsWith(".webm")
  ) {
    return "video";
  }

  if (
    fileName.endsWith(".mp3") ||
    fileName.endsWith(".m4a") ||
    fileName.endsWith(".aac") ||
    fileName.endsWith(".ogg") ||
    fileName.endsWith(".wav")
  ) {
    return "audio";
  }

  return "document";
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value = value / 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function getAttachmentIcon(type: SelectedAttachment["type"]) {
  if (type === "image") return "📷";
  if (type === "video") return "🎥";
  if (type === "audio") return "🎧";
  return "📄";
}

export default function MessageComposer({
  disabled,
  quickReplies,
  onSend,
  onAiSuggest,
  onSendMedia,
  blocked = false,
  needsHumanAttention = false,
}: {
  disabled: boolean;
  quickReplies: QuickReply[];
  onSend: (body: string) => Promise<void>;
  onAiSuggest: () => Promise<string | null>;
  onSendMedia?: (file: File, caption: string) => Promise<void>;
  blocked?: boolean;
  needsHumanAttention?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanText = text.trim();
  const fullyDisabled = disabled || blocked;

  const canSendText =
    !fullyDisabled && !sending && !attachment && cleanText.length > 0;
  const canSendMedia = !fullyDisabled && !sending && Boolean(attachment);
  const canSend = canSendText || canSendMedia;

  const acceptedFileTypes = useMemo(() => {
    return [
      "image/*",
      "video/*",
      "audio/*",
      "application/pdf",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
      ".csv",
    ].join(",");
  }, []);

  useEffect(() => {
    if (disabled) {
      setShowQuickReplies(false);
      setError(null);
      setText("");
      clearAttachment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(() => {
    if (blocked) {
      setShowQuickReplies(false);
      setError(null);
      clearAttachment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 116)}px`;
  }, [text]);

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment?.previewUrl]);

  function clearAttachment() {
    setAttachment((currentAttachment) => {
      if (currentAttachment?.previewUrl) {
        URL.revokeObjectURL(currentAttachment.previewUrl);
      }

      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    setError(null);

    if (!file) return;

    const attachmentType = detectAttachmentType(file);
    const previewUrl =
      attachmentType === "image" || attachmentType === "video"
        ? URL.createObjectURL(file)
        : null;

    clearAttachment();

    setAttachment({
      file,
      type: attachmentType,
      previewUrl,
    });

    setShowQuickReplies(false);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  async function handleSend() {
    if (!canSend) return;

    if (blocked) {
      setError("This customer is blocked. Unblock them before sending.");
      return;
    }

    if (needsHumanAttention) {
      const confirmed = window.confirm(
        "This chat is marked as needing human attention. Send this message anyway?"
      );

      if (!confirmed) return;
    }

    setSending(true);
    setError(null);

    try {
      if (attachment) {
        if (!onSendMedia) {
          throw new Error(
            "Media sending is ready in the composer, but the parent chat file is not connected yet."
          );
        }

        await onSendMedia(attachment.file, cleanText);
        setText("");
        clearAttachment();
        setShowQuickReplies(false);

        window.setTimeout(() => {
          textareaRef.current?.focus();
        }, 50);

        return;
      }

      await onSend(cleanText);
      setText("");
      setShowQuickReplies(false);

      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch (error) {
      console.error("Message send failed:", error);
      setError(error instanceof Error ? error.message : "Message send failed.");
    } finally {
      setSending(false);
    }
  }

  async function handleSuggest() {
    if (fullyDisabled || suggesting || attachment) return;

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
      setError(error instanceof Error ? error.message : "AI suggestion failed.");
    } finally {
      setSuggesting(false);
    }
  }

  function applyQuickReply(reply: QuickReply) {
    setText(reply.content);
    setShowQuickReplies(false);
    setError(null);
    clearAttachment();

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  function handleAttachmentClick() {
    if (fullyDisabled || sending) return;

    setError(null);
    fileInputRef.current?.click();
  }

  return (
    <div className="bg-[#f0f2f5] px-2 py-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        className="hidden"
        onChange={handleFileChange}
        disabled={fullyDisabled || sending}
      />

      {blocked ? (
        <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          <span className="font-black">Blocked customer.</span> Unblock this
          customer before sending manual messages.
        </div>
      ) : needsHumanAttention ? (
        <div className="mb-2 hidden rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 md:block">
          <span className="font-black">Needs human attention.</span> This chat
          should be handled manually. AI auto-reply should stay off until you
          give the chat back to AI.
        </div>
      ) : null}

      {error ? (
        <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {error}
        </div>
      ) : null}

      {attachment ? (
        <div className="mb-2 overflow-hidden rounded-2xl border border-[#d1d7db] bg-white shadow-lg">
          <div className="flex items-start gap-3 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f0f2f5] text-2xl">
              {attachment.type === "image" && attachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name || "Selected image"}
                  className="h-full w-full object-cover"
                />
              ) : attachment.type === "video" && attachment.previewUrl ? (
                <video
                  src={attachment.previewUrl}
                  className="h-full w-full object-cover"
                  muted
                />
              ) : (
                <span>{getAttachmentIcon(attachment.type)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#111b21]">
                {attachment.file.name || "Selected file"}
              </p>

              <p className="mt-0.5 text-xs text-[#667781]">
                {attachment.type.toUpperCase()} ·{" "}
                {formatFileSize(attachment.file.size)}
              </p>

              <p className="mt-1 text-xs leading-5 text-[#667781]">
                Add a caption or send the file directly.
              </p>
            </div>

            <button
              type="button"
              onClick={clearAttachment}
              disabled={sending}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-[#667781] transition hover:bg-[#f0f2f5] hover:text-[#111b21] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Remove attachment"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {showQuickReplies ? (
        <div className="mb-2 max-h-56 overflow-y-auto rounded-2xl border border-[#d1d7db] bg-white p-2 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[#667781]">
              Quick replies
            </p>

            <button
              type="button"
              onClick={() => setShowQuickReplies(false)}
              className="rounded-full px-2 py-1 text-xs font-bold text-[#667781] hover:bg-[#f0f2f5] hover:text-[#111b21]"
            >
              Close
            </button>
          </div>

          {quickReplies.length === 0 ? (
            <div className="rounded-xl bg-[#f0f2f5] px-3 py-4 text-center">
              <p className="text-xs leading-5 text-[#667781]">
                No quick replies yet.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => applyQuickReply(reply)}
                  className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-[#f5f6f6] active:bg-[#e9edef]"
                >
                  <span className="block truncate text-sm font-bold text-[#111b21]">
                    {reply.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs leading-5 text-[#667781]">
                    {reply.content}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-end gap-1.5 md:gap-2">
        <button
          type="button"
          disabled={fullyDisabled || Boolean(attachment)}
          title="Quick replies"
          onClick={() => setShowQuickReplies((value) => !value)}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[20px] text-[#54656f] transition hover:bg-[#e9edef] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Quick replies"
        >
          ⚡
        </button>

        <div className="min-w-0 flex-1 rounded-[24px] bg-white px-2 py-1.5 shadow-sm">
          <div className="flex items-end gap-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => {
                setText(event.target.value);

                if (error) setError(null);
              }}
              disabled={fullyDisabled || sending}
              placeholder={
                blocked
                  ? "Customer is blocked"
                  : disabled
                    ? "Select a chat"
                    : attachment
                      ? "Add a caption"
                      : suggesting
                        ? "Generating..."
                        : "Message"
              }
              rows={1}
              className="max-h-28 min-h-[28px] flex-1 resize-none bg-transparent px-2 py-1 text-[15px] leading-6 text-[#111b21] outline-none placeholder:text-[#667781] disabled:cursor-not-allowed"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />

            <button
              type="button"
              disabled={fullyDisabled || sending}
              title="Attach image, video or file"
              onClick={handleAttachmentClick}
              className="mb-[1px] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[22px] text-[#54656f] transition hover:bg-[#e9edef] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Attach file"
            >
              📎
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={fullyDisabled || suggesting || Boolean(attachment)}
          onClick={() => void handleSuggest()}
          title="Generate AI reply suggestion"
          className="mb-0.5 hidden h-10 shrink-0 items-center justify-center rounded-full bg-[#e7fce3] px-3 text-xs font-black text-[#008069] transition hover:bg-[#d9fdd3] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 md:flex"
        >
          {suggesting ? "AI..." : "AI"}
        </button>

        <button
          type="button"
          disabled={!canSend}
          onClick={() => void handleSend()}
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-xl font-black text-white shadow-sm transition hover:bg-[#008f72] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 md:w-auto md:px-5 md:text-sm"
          aria-label={attachment ? "Send file" : "Send message"}
        >
          {sending ? "…" : attachment ? "➤" : "➤"}
        </button>
      </div>
    </div>
  );
}