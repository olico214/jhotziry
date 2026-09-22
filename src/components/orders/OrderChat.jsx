"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function OrderChat({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/orders/${orderId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const response = await apiFetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      if (response.ok) {
        setText("");
        await load();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl glass-soft p-3">
        {loading && messages.length === 0 ? (
          <p className="text-xs text-ink-soft">Cargando…</p>
        ) : null}
        {!loading && messages.length === 0 ? (
          <p className="text-xs text-ink-soft">
            Sin mensajes todavía. Escribe el primero.
          </p>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.mine ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                message.mine
                  ? "bg-blush-500 text-white"
                  : "border border-blush-100 glass text-ink",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  message.mine ? "text-white/70" : "text-ink-soft/70",
                )}
              >
                {message.isAdmin ? "Equipo" : "Cliente"} ·{" "}
                {new Date(message.createdAt).toLocaleString("es", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe un mensaje…"
          maxLength={1000}
        />
        <Button type="submit" loading={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
