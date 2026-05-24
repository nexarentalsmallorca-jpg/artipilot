"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { id: string; title: string; content: string };

export default function QuickRepliesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/private/quick-replies", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/private/quick-replies", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add");
      return;
    }
    setTitle("");
    setContent("");
    await load();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-white">Quick Replies</h1>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}

      <form onSubmit={(e) => void handleAdd(e)} className="mt-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="w-full rounded-xl border border-white/10 bg-[#111B21] px-4 py-2 text-white"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message content"
          required
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-[#111B21] px-4 py-2 text-white"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#00A884] px-4 py-2 text-sm font-semibold text-black"
        >
          Add quick reply
        </button>
      </form>

      <ul className="mt-8 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-white/10 bg-[#111B21] p-4"
          >
            <p className="font-medium text-white">{item.title}</p>
            <p className="mt-1 text-sm text-[#8696A0]">{item.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
