"use client";

import { useCallback, useEffect, useState } from "react";

type QuickReply = {
  id: string;
  title: string;
  content: string;
};

export default function QuickRepliesPage() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadQuickReplies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/private/quick-replies", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load quick replies.");
      }

      setItems(data.items || []);
    } catch (error) {
      console.error("Quick replies load error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load quick replies."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuickReplies();
  }, [loadQuickReplies]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      setError("Title and message content are required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/private/quick-replies", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: cleanTitle,
          content: cleanContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add quick reply.");
      }

      setTitle("");
      setContent("");
      setSuccess("Quick reply added.");
      await loadQuickReplies();
    } catch (error) {
      console.error("Quick replies save error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to add quick reply."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] px-4 py-6 text-[#111b21] md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#008069]">
            Private system
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111b21]">
            Quick Replies
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667781]">
            Save common WhatsApp replies so you can insert them quickly inside
            the inbox.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-3xl border border-[#c8f7c0] bg-[#e7fce3] p-4 text-sm leading-6 text-[#008069] shadow-sm">
            {success}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={(event) => void handleAdd(event)}
            className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-black text-[#111b21]">
              Add quick reply
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#667781]">
              Example: price info, license requirement, deposit, location, or
              booking link.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="quick-title"
                  className="block text-sm font-bold text-[#111b21]"
                >
                  Title
                </label>

                <input
                  id="quick-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Booking link"
                  required
                  className="mt-2 w-full rounded-2xl border border-[#d1d7db] bg-[#f0f2f5] px-4 py-3 text-sm text-[#111b21] outline-none transition placeholder:text-[#667781] focus:border-[#00a884] focus:bg-white focus:ring-4 focus:ring-[#00a884]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="quick-content"
                  className="block text-sm font-bold text-[#111b21]"
                >
                  Message content
                </label>

                <textarea
                  id="quick-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write the WhatsApp message here..."
                  required
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-[#d1d7db] bg-[#f0f2f5] px-4 py-3 text-sm leading-6 text-[#111b21] outline-none transition placeholder:text-[#667781] focus:border-[#00a884] focus:bg-white focus:ring-4 focus:ring-[#00a884]/10"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-[#00a884] px-4 py-3 text-sm font-black text-white transition hover:bg-[#008f72] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add quick reply"}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#111b21]">
                  Saved replies
                </h2>

                <p className="mt-1 text-sm text-[#667781]">
                  {items.length} quick replies saved
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadQuickReplies()}
                disabled={loading}
                className="rounded-full bg-[#f0f2f5] px-4 py-2 text-xs font-black text-[#54656f] transition hover:bg-[#e9edef] hover:text-[#111b21] disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {loading && items.length === 0 ? (
              <div className="rounded-2xl bg-[#f0f2f5] p-5 text-sm text-[#667781]">
                Loading quick replies...
              </div>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="rounded-2xl bg-[#f0f2f5] p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#d9fdd3] text-xl">
                  ⚡
                </div>

                <h3 className="font-black text-[#111b21]">
                  No quick replies yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#667781]">
                  Add your first quick reply and it will appear inside the
                  message composer.
                </p>
              </div>
            ) : null}

            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[#e9edef] bg-[#f0f2f5] p-4"
                  >
                    <h3 className="text-sm font-black text-[#111b21]">
                      {item.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#54656f]">
                      {item.content}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}