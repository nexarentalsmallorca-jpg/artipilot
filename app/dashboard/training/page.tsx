"use client";

import { useCallback, useEffect, useState } from "react";
import PrivateDashboardShell from "@/components/dashboard/PrivateDashboardShell";
import { supabase } from "@/lib/supabaseClient";

type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  is_active: boolean;
};

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function TrainingPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const headers = await authHeaders();
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`/api/training${query}`, { headers });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function saveItem() {
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    const res = await fetch("/api/training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: editingId || undefined,
        title,
        content,
        category,
        is_active: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error || "Could not save knowledge.");
      return;
    }
    setTitle("");
    setContent("");
    setCategory("General");
    setEditingId(null);
    setNotice("Knowledge saved.");
    void loadItems();
  }

  async function toggleActive(item: KnowledgeItem) {
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    await fetch("/api/training", {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        is_active: !item.is_active,
      }),
    });
    void loadItems();
  }

  async function removeItem(id: string) {
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    await fetch("/api/training", {
      method: "POST",
      headers,
      body: JSON.stringify({ id, delete: true }),
    });
    void loadItems();
  }

  return (
    <PrivateDashboardShell title="AI training">
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#111B21] p-5">
          <label className="block text-sm text-[#8696A0]">Search knowledge</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
            placeholder="Search title, content, category"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111B21] p-5">
          <h2 className="text-base font-semibold">{editingId ? "Edit knowledge" : "Add knowledge"}</h2>
          <div className="mt-4 grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Knowledge content used by AI when replying"
              className="rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
            />
            <button
              type="button"
              onClick={() => void saveItem()}
              className="rounded-xl bg-[#00A884] px-4 py-3 text-sm font-semibold text-white"
            >
              {editingId ? "Update" : "Add"} knowledge
            </button>
            {notice ? <p className="text-sm text-[#8696A0]">{notice}</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111B21] p-5">
          <h2 className="text-base font-semibold">Knowledge library</h2>
          {loading ? (
            <p className="mt-4 text-sm text-[#8696A0]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-[#8696A0]">No knowledge yet. Add your first item above.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 bg-[#0B141A] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-[#00A884]">{item.category || "General"}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#8696A0]">{item.content}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs"
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setTitle(item.title);
                          setContent(item.content);
                          setCategory(item.category || "General");
                        }}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeItem(item.id)}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PrivateDashboardShell>
  );
}
