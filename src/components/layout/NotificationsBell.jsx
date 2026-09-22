"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiFetch("/api/notifications");
      if (!response.ok) throw new Error("No se pudieron cargar las notificaciones");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const notifications = query.data?.notifications ?? [];
  const unread = query.data?.unread ?? 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const openItem = async (notification) => {
    if (!notification.read) {
      await apiFetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      });
      invalidate();
    }
    setOpen(false);
    if (notification.link) router.push(notification.link);
  };

  const markAll = async () => {
    await apiFetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    invalidate();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-blush-200 glass text-ink"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blush-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Notificaciones"
        description="Novedades de tus pedidos y publicaciones."
      >
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-ink-soft">Sin notificaciones todavía.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openItem(notification)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                    notification.read
                      ? "border-blush-100 glass"
                      : "border-blush-300 glass-soft",
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {notification.title}
                    {!notification.read ? (
                      <span className="h-2 w-2 rounded-full bg-blush-500" />
                    ) : null}
                  </p>
                  {notification.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                      {notification.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-ink-soft">
                    {new Date(notification.createdAt).toLocaleString("es", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}

          {unread > 0 ? (
            <Button variant="secondary" className="w-full" onClick={markAll}>
              Marcar todas como leídas
            </Button>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
