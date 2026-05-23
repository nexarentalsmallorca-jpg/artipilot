"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPrivateApi,
  parsePrivateApiError,
  privateApiErrorLabel,
} from "@/lib/dashboard/privateFetch";

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
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetchPrivateApi("/api/quick-replies", { method: "GET" });
      const data = await res.json();
      if (!res.ok) {
        setError(await parsePrivateApiError("Quick replies", res));
        return;
      }
      setItems(data.items || []);
    } catch {
      setError(privateApiErrorLabel("Quick replies", "Network error"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setError("");
    const payload = editingId
      ? { id: editingId, title, content, active: true }
      : { title, content, active: true };
    const res = await fetchPrivateApi("/api/quick-replies", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError(await parsePrivateApiError("Quick replies", res));
      return;
    }
    setTitle("");
    setContent("");
    setEditingId(null);
    void load();
  }

  async function toggle(item: Item) {
    setError("");
    const res = await fetchPrivateApi("/api/quick-replies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    if (!res.ok) {
      setError(await parsePrivateApiError("Quick replies", res));
      return;
    }
    void load();
  }

  async function remove(id: string) {
    setError("");
    const res = await fetchPrivateApi(`/api/quick-replies?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(await parsePrivateApiError("Quick replies", res));
      return;
    }
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Quick Replies</h1>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

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
