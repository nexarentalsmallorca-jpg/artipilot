"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  active: boolean;
};

export default function QuickRepliesClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/quick-replies", { credentials: "include" });
    const data = await res.json();
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (editingId) {
      await fetch("/api/quick-replies", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, title, content, active: true }),
      });
    } else {
      await fetch("/api/quick-replies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, active: true }),
      });
    }
    setTitle("");
    setContent("");
    setEditingId(null);
    void load();
  }

  async function toggle(item: Item) {
    await fetch("/api/quick-replies", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/quick-replies?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Quick Replies</h1>

      <div className="rounded-2xl border border-white/10 bg-[#111B21] p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Label"
          className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Message"
          className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void save()}
          className="rounded-xl bg-[#00A884] px-4 py-2 text-sm font-semibold text-white"
        >
          {editingId ? "Update" : "Add"}
        </button>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-[#111B21] p-4">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-[#8696A0]">{item.content}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void toggle(item)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs"
              >
                {item.active ? "Active" : "Inactive"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(item.id);
                  setTitle(item.title);
                  setContent(item.content);
                }}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void remove(item.id)}
                className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-300"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
