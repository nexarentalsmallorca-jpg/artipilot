"use client";

import { useCallback, useEffect, useState } from "react";
import PrivateDashboardShell from "@/components/dashboard/PrivateDashboardShell";
import { supabase } from "@/lib/supabaseClient";

type QuickReply = {
  id: string;
  title: string;
  message: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function QuickRepliesPage() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch("/api/quick-replies", { headers });
    const data = await res.json();
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function saveItem() {
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    await fetch("/api/quick-replies", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: editingId || undefined, title, message }),
    });
    setTitle("");
    setMessage("");
    setEditingId(null);
    void loadItems();
  }

  async function removeItem(id: string) {
    const headers = {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    };
    await fetch("/api/quick-replies", {
      method: "POST",
      headers,
      body: JSON.stringify({ id, delete: true }),
    });
    void loadItems();
  }

  return (
    <PrivateDashboardShell title="Quick replies">
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#111B21] p-5">
          <h2 className="text-base font-semibold">{editingId ? "Edit quick reply" : "New quick reply"}</h2>
          <div className="mt-4 grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Label"
              className="rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Message text"
              className="rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3 text-sm outline-none focus:border-[#00A884]"
            />
            <button
              type="button"
              onClick={() => void saveItem()}
              className="rounded-xl bg-[#00A884] px-4 py-3 text-sm font-semibold text-white"
            >
              Save
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111B21] p-5">
          <h2 className="text-base font-semibold">Saved replies</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-white/10 bg-[#0B141A] p-4">
                <p className="font-medium">{item.title}</p>
                <p className="mt-2 text-sm text-[#8696A0]">{item.message}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setTitle(item.title);
                      setMessage(item.message);
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
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PrivateDashboardShell>
  );
}
