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
    <div className="h-full overflow-y-auto bg-[#0b141a] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00a884]">
            Private system
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Quick Replies
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8696a0]">
            Save common WhatsApp replies so you can insert them quickly inside
            the inbox.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={(event) => void handleAdd(event)}
            className="rounded-3xl border border-white/10 bg-[#111b21] p-5"
          >
            <h2 className="text-lg font-black text-white">
              Add quick reply
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#8696a0]">
              Example: price info, license requirement, deposit, location, or
              booking link.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="quick-title"
                  className="block text-sm font-bold text-slate-200"
                >
                  Title
                </label>

                <input
                  id="quick-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Booking link"
                  required
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b141a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#8696a0] focus:border-[#00a884]/70 focus:ring-4 focus:ring-[#00a884]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="quick-content"
                  className="block text-sm font-bold text-slate-200"
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
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0b141a] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-[#8696a0] focus:border-[#00a884]/70 focus:ring-4 focus:ring-[#00a884]/10"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-[#00a884] px-4 py-3 text-sm font-black text-black transition hover:bg-[#06cf9c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add quick reply"}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-white/10 bg-[#111b21] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  Saved replies
                </h2>
                <p className="mt-1 text-sm text-[#8696a0]">
                  {items.length} quick replies saved
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadQuickReplies()}
                disabled={loading}
                className="rounded-full bg-white/[0.06] px-4 py-2 text-xs font-black text-[#8696a0] transition hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {loading && items.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.04] p-5 text-sm text-[#8696a0]">
                Loading quick replies...
              </div>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.04] p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#00a884]/10 text-xl">
                  ⚡
                </div>

                <h3 className="font-black text-white">
                  No quick replies yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#8696a0]">
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
                    className="rounded-2xl border border-white/10 bg-[#0b141a] p-4"
                  >
                    <h3 className="text-sm font-black text-white">
                      {item.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#8696a0]">
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