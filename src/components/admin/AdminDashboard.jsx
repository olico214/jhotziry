"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Download, Loader2, Plus, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

const ORDER_STATUS = ["new", "generating", "ready", "failed", "done", "cancelled"];

const STATUS_LABEL = {
  new: "Nuevo",
  generating: "Generando modelo",
  ready: "Modelo listo",
  failed: "Error",
  done: "Completado",
  cancelled: "Cancelado",
};

export function AdminDashboard({ users, orders }) {
  const router = useRouter();
  const [busy, setBusy] = useState({});
  const [creditModal, setCreditModal] = useState(null);

  const setOrderBusy = (id, value) =>
    setBusy((prev) => ({ ...prev, [id]: value }));

  const adjustCredits = async (userId, amount, reason) => {
    await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, reason }),
    });
    router.refresh();
  };

  const pollJob = async (jobId) => {
    for (let i = 0; i < 120; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (!response.ok) break;
      const data = await response.json();
      if (data.status === "succeeded" || data.status === "failed") {
        return data.status;
      }
    }
    return "timeout";
  };

  const generateModel = async (orderId) => {
    setOrderBusy(orderId, "generating");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/generate`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setOrderBusy(orderId, "error");
        return;
      }
      await pollJob(data.jobId);
      router.refresh();
    } finally {
      setOrderBusy(orderId, null);
    }
  };

  const updateStatus = async (orderId, status) => {
    setOrderBusy(orderId, "status");
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setOrderBusy(orderId, null);
    }
  };

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">Usuarios y créditos</h2>
        <div className="overflow-hidden rounded-4xl border border-blush-100 bg-white/70">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-blush-100 px-5 py-4 last:border-b-0"
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {user.email}
                  {user.isAdmin ? (
                    <span className="ml-2 rounded-full bg-blush-100 px-2 py-0.5 text-xs text-blush-700">
                      admin
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                  <Coins className="h-3.5 w-3.5 text-blush-500" />
                  {user.credits} créditos
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {user.activeSessions && Number(user.activeSessions) > 0 ? (
                    <span className="font-semibold text-emerald-600">
                      En línea ({Number(user.activeSessions)} sesión
                      {Number(user.activeSessions) === 1 ? "" : "es"})
                    </span>
                  ) : (
                    <span>Sin sesión activa</span>
                  )}
                  {" · "}
                  Última conexión:{" "}
                  {user.verifiedAt
                    ? new Date(user.verifiedAt).toLocaleString("es")
                    : "nunca"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => adjustCredits(user.id, 10, "Recarga rápida +10")}
                >
                  <Plus className="h-4 w-4" />
                  10
                </Button>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => setCreditModal(user)}
                >
                  Ajustar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">Pedidos</h2>
        {orders.length === 0 ? (
          <p className="rounded-4xl border border-dashed border-blush-200 bg-white/60 px-6 py-10 text-center text-sm text-ink-soft">
            Todavía no hay pedidos.
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {orders.map(({ order, draft, email }) => (
              <article
                key={order.id}
                className="flex gap-4 rounded-4xl border border-blush-100 bg-white/70 p-4 shadow-sm"
              >
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-3xl bg-blush-50">
                  {draft.previewPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/preview/${draft.id}`}
                      alt="Vista previa"
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {order.name}
                      </p>
                      <p className="truncate text-xs text-ink-soft">{email}</p>
                    </div>
                    <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold text-blush-700">
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  {order.notes ? (
                    <p className="mt-2 line-clamp-2 text-xs text-ink-soft">
                      {order.notes}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                    {order.modelPath ? (
                      <a href={`/api/files/${draft.id}`} download>
                        <Button size="md">
                          <Download className="h-4 w-4" />
                          Descargar GLB
                        </Button>
                      </a>
                    ) : (
                      <Button
                        size="md"
                        onClick={() => generateModel(order.id)}
                        disabled={busy[order.id] === "generating"}
                      >
                        {busy[order.id] === "generating" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        Generar 3D
                      </Button>
                    )}

                    <select
                      value={order.status}
                      onChange={(event) =>
                        updateStatus(order.id, event.target.value)
                      }
                      className="rounded-full border border-blush-200 bg-blush-50/60 px-3 py-2 text-xs font-semibold text-ink"
                    >
                      {ORDER_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>

                    {busy[order.id] === "status" ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-blush-400" />
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <CreditModal
        user={creditModal}
        onClose={() => setCreditModal(null)}
        onSaved={() => {
          setCreditModal(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function CreditModal({ user, onClose, onSaved }) {
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        amount: Number(amount),
        reason: reason || "Ajuste del administrador",
      }),
    });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal
      open={Boolean(user)}
      onOpenChange={(next) => (!next ? onClose() : null)}
      title="Ajustar créditos"
      description={user.email}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Cantidad (usa negativo para restar)
          </label>
          <Input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Motivo
          </label>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Recarga de créditos"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
