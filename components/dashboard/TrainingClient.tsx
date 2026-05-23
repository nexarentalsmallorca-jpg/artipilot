"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  title: string;
  category: string | null;
  content: string;
  active: boolean;
};

export default function TrainingClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`/api/training${q}`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setItems(data.items || []);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const method = editingId ? "PATCH" : "POST";
    const body = editingId
      ? { id: editingId, title, category, content, active: true }
      : { title, category, content, active: true };
    const res = await fetch("/api/training", {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Save failed");
      return;
    }
    setTitle("");
    setContent("");
    setEditingId(null);
    void load();
  }

  async function toggleActive(item: Item) {
    await fetch("/api/training", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/training?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Training</h1>
        <p className="mt-1 text-sm text-[#8696A0]">
          Knowledge used when the AI replies to customers.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search knowledge"
        className="w-full rounded-xl border border-white/10 bg-[#111B21] px-4 py-3 text-sm"
      />

      <div className="rounded-2xl border border-white/10 bg-[#111B21] p-4 space-y-3">
        <h2 className="font-medium">{editingId ? "Edit" : "Add"} knowledge</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="Content"
          className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void save()}
          className="rounded-xl bg-[#00A884] px-4 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-[#111B21] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-[#00A884]">{item.category || "General"}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#8696A0]">{item.content}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void toggleActive(item)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs"
                >
                  {item.active ? "Active" : "Inactive"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setTitle(item.title);
                    setCategory(item.category || "General");
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
