"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Coins,
  Download,
  Inbox,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { OrderChat } from "@/components/orders/OrderChat";

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", icon: Package },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "blog", label: "Blog", icon: Star },
  { id: "invitaciones", label: "Invitaciones", icon: Inbox },
];

const ORDER_STATUS = ["new", "generating", "ready", "failed", "done", "cancelled"];

const STATUS_LABEL = {
  new: "Nuevo",
  generating: "Generando modelo",
  ready: "Modelo listo",
  failed: "Error",
  done: "Completado",
  cancelled: "Cancelado",
};

export function AdminDashboard({
  users,
  orders,
  invitations,
  accessRequests,
  posts = [],
}) {
  const router = useRouter();
  const [tab, setTab] = useState("resumen");
  const [busy, setBusy] = useState({});
  const [creditModal, setCreditModal] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  const [orderSort, setOrderSort] = useState("recent");
  const [ordersFiltersOpen, setOrdersFiltersOpen] = useState(false);
  const [chatOrderId, setChatOrderId] = useState(null);
  const [userQuery, setUserQuery] = useState("");

  const activeOrderFilters =
    (orderStatus !== "all" ? 1 : 0) +
    (orderFrom ? 1 : 0) +
    (orderTo ? 1 : 0) +
    (orderSort !== "recent" ? 1 : 0);

  const clearOrderFilters = () => {
    setOrderStatus("all");
    setOrderFrom("");
    setOrderTo("");
    setOrderSort("recent");
  };

  const setOrderBusy = (id, value) =>
    setBusy((prev) => ({ ...prev, [id]: value }));

  const stats = useMemo(() => {
    const byStatus = {};
    for (const status of ORDER_STATUS) byStatus[status] = 0;
    for (const { order } of orders) {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    }
    return {
      total: orders.length,
      byStatus,
      users: users.length,
      credits: users.reduce((sum, user) => sum + (user.credits || 0), 0),
      pendingRequests: accessRequests?.length || 0,
    };
  }, [orders, users, accessRequests]);

  const filteredOrders = useMemo(() => {
    const texto = orderQuery.trim().toLowerCase();

    const list = orders.filter((item) => {
      const { order, email } = item;
      if (orderStatus !== "all" && order.status !== orderStatus) return false;
      const created = new Date(order.createdAt);
      if (orderFrom && created < new Date(`${orderFrom}T00:00:00`)) return false;
      if (orderTo && created > new Date(`${orderTo}T23:59:59`)) return false;
      if (texto) {
        const hay = `${order.name} ${email} ${order.description || ""} ${
          order.address || ""
        }`.toLowerCase();
        if (!hay.includes(texto)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const da = new Date(a.order.createdAt).getTime();
      const db = new Date(b.order.createdAt).getTime();
      return orderSort === "recent" ? db - da : da - db;
    });

    return list;
  }, [orders, orderStatus, orderQuery, orderFrom, orderTo, orderSort]);

  const filteredUsers = useMemo(() => {
    const texto = userQuery.trim().toLowerCase();
    if (!texto) return users;
    return users.filter((user) =>
      `${user.email} ${user.fullName || ""} ${user.address || ""}`
        .toLowerCase()
        .includes(texto),
    );
  }, [users, userQuery]);

  const pollJob = async (jobId) => {
    for (let i = 0; i < 120; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const response = await apiFetch(`/api/jobs/${jobId}`, { cache: "no-store" });
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
      const response = await apiFetch(`/api/admin/orders/${orderId}/generate`, {
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
      await apiFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setOrderBusy(orderId, null);
    }
  };

  const adjustCredits = async (userId, amount, reason) => {
    await apiFetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, reason }),
    });
    router.refresh();
  };

  const updatePost = async (id, patch) => {
    setOrderBusy(`post-${id}`, "saving");
    try {
      await apiFetch(`/api/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      router.refresh();
    } finally {
      setOrderBusy(`post-${id}`, null);
    }
  };

  const sendInvite = async (event) => {
    event.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const response = await apiFetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo invitar");
      setInviteResult(data);
      setInviteEmail("");
      router.refresh();
    } catch (error) {
      setInviteResult({ error: error.message });
    } finally {
      setInviting(false);
    }
  };

  const inviteRequest = async (id) => {
    setOrderBusy(`req-${id}`, "inviting");
    try {
      await apiFetch(`/api/admin/access-requests/${id}/invite`, { method: "POST" });
      router.refresh();
    } finally {
      setOrderBusy(`req-${id}`, null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          const badge =
            item.id === "invitaciones" ? stats.pendingRequests : 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-blush-500 text-white shadow-sm shadow-blush-200"
                  : "border border-blush-200 glass text-ink-soft hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {badge > 0 ? (
                <span className="rounded-full bg-white/30 px-2 text-xs">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "resumen" ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Package} label="Pedidos totales" value={stats.total} />
            <StatCard
              icon={Clock}
              label="En proceso"
              value={(stats.byStatus.new || 0) + (stats.byStatus.generating || 0)}
            />
            <StatCard
              icon={ShieldCheck}
              label="Listos / completados"
              value={(stats.byStatus.ready || 0) + (stats.byStatus.done || 0)}
            />
            <StatCard
              icon={Inbox}
              label="Solicitudes pendientes"
              value={stats.pendingRequests}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Users} label="Usuarios" value={stats.users} />
            <StatCard icon={Coins} label="Créditos en circulación" value={stats.credits} />
            <StatCard
              icon={Mail}
              label="Invitaciones enviadas"
              value={invitations?.length || 0}
            />
          </div>

          <div className="rounded-4xl border border-blush-100 glass p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Últimos pedidos</h3>
              <button
                type="button"
                onClick={() => setTab("pedidos")}
                className="text-xs font-semibold text-blush-600 hover:underline"
              >
                Ver todos
              </button>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-ink-soft">Aún no hay pedidos.</p>
            ) : (
              <ul className="space-y-2">
                {orders.slice(0, 5).map(({ order, draft, email }) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-blush-100 glass-soft">
                      {draft.previewImage || draft.previewPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/preview/${draft.id}`}
                          alt={order.description || "Producto"}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center">
                          <Package className="h-4 w-4 text-blush-300" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {order.description || "Pieza impresa"} ·{" "}
                      <span className="text-ink-soft">{order.name}</span>
                    </span>
                    <span className="hidden shrink-0 truncate text-xs text-ink-soft sm:block sm:max-w-[40%]">
                      {email}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {tab === "pedidos" ? (
        <section className="space-y-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <Input
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                placeholder="Buscar pedido"
                className="pl-9"
              />
            </div>
            <button
              type="button"
              onClick={() => setOrdersFiltersOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-2xl border border-blush-200 glass px-4 text-sm font-semibold text-ink"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeOrderFilters > 0 ? (
                <span className="rounded-full bg-blush-500 px-1.5 text-xs text-white">
                  {activeOrderFilters}
                </span>
              ) : null}
            </button>
          </div>

          <Modal
            open={ordersFiltersOpen}
            onOpenChange={setOrdersFiltersOpen}
            title="Filtros de pedidos"
            description="Elige qué pedidos quieres ver."
          >
            <div className="space-y-4">
              <OrderFilterFields
                stacked
                status={orderStatus}
                setStatus={setOrderStatus}
                from={orderFrom}
                setFrom={setOrderFrom}
                to={orderTo}
                setTo={setOrderTo}
                sort={orderSort}
                setSort={setOrderSort}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={clearOrderFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpiar
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => setOrdersFiltersOpen(false)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </Modal>

          <p className="text-xs text-ink-soft">
            {filteredOrders.length} de {orders.length} pedidos
          </p>

          {filteredOrders.length === 0 ? (
            <p className="rounded-4xl border border-dashed border-blush-200 glass px-6 py-12 text-center text-sm text-ink-soft">
              No hay pedidos que coincidan con los filtros.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredOrders.map(({ order, draft, email }) => (
                <article
                  key={order.id}
                  className="flex min-w-0 gap-4 rounded-4xl border border-blush-100 glass p-4 shadow-sm"
                >
                  <a
                    href={`/api/preview/${draft.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-blush-100 glass-soft sm:h-36 sm:w-36"
                  >
                    {draft.previewImage || draft.previewPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/preview/${draft.id}`}
                        alt={order.description || "Producto"}
                        className="h-full w-full object-contain transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-blush-300" />
                      </div>
                    )}
                  </a>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {order.name}
                        </p>
                        <p className="truncate text-xs text-ink-soft">{email}</p>
                        {order.address ? (
                          <p className="mt-0.5 break-words text-xs text-ink-soft">
                            {order.address}
                          </p>
                        ) : null}
                        {order.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                            {order.description}
                          </p>
                        ) : null}
                        {draft.prompt ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">
                            Prompt: {draft.prompt}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-ink-soft">
                          Cantidad: {order.quantity ?? 1}
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold text-blush-700">
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() => setChatOrderId(order.id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Mensajes
                      </Button>
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
                        className="rounded-full border border-blush-200 glass-soft px-3 py-2 text-xs font-semibold text-ink"
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
      ) : null}

      {tab === "usuarios" ? (
        <section className="space-y-5">
          <div className="rounded-4xl border border-blush-100 glass p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <Input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="Buscar por correo, nombre o domicilio"
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-4xl border border-blush-100 glass">
            {filteredUsers.map((user) => (
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
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {user.fullName || "Sin nombre"}
                    {user.address ? ` · ${user.address}` : ""}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                    <Coins className="h-3.5 w-3.5 text-blush-500" />
                    {user.credits} créditos
                    {" · "}
                    {user.activeSessions && Number(user.activeSessions) > 0 ? (
                      <span className="font-semibold text-emerald-600">
                        En línea
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
                    onClick={() =>
                      adjustCredits(user.id, 10, "Recarga rápida +10")
                    }
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
      ) : null}

      {tab === "blog" ? (
        <section className="space-y-5">
          <p className="text-xs text-ink-soft">
            {posts.length} publicaciones ·{" "}
            {posts.filter((post) => post.featured).length} destacadas
          </p>

          {posts.length === 0 ? (
            <p className="rounded-4xl border border-dashed border-blush-200 glass px-6 py-12 text-center text-sm text-ink-soft">
              Todavía no hay publicaciones.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className={cn(
                    "flex gap-4 rounded-4xl border glass p-4 shadow-sm",
                    post.featured ? "border-blush-300" : "border-blush-100",
                  )}
                >
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-3xl border border-blush-100 glass-soft">
                    {post.hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/posts/${post.id}/image`}
                        alt={post.title || "Publicación"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Star className="h-6 w-6 text-blush-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {post.title || "Sin título"}
                        </p>
                        <p className="text-xs text-ink-soft">{post.author}</p>
                        {post.body ? (
                          <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                            {post.body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-ink-soft">
                          ♥ {post.likeCount} · 💬 {post.commentCount}
                          {post.status === "hidden" ? " · oculta" : ""}
                        </p>
                      </div>
                      {post.featured ? (
                        <span className="rounded-full bg-blush-100 px-2 py-0.5 text-xs font-semibold text-blush-700">
                          Destacado
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 pt-3">
                      <Button
                        size="md"
                        variant={post.featured ? "secondary" : "primary"}
                        disabled={busy[`post-${post.id}`] === "saving"}
                        onClick={() =>
                          updatePost(post.id, { featured: !post.featured })
                        }
                      >
                        <Star className="h-4 w-4" />
                        {post.featured ? "Quitar destacado" : "Destacar"}
                      </Button>
                      <Button
                        size="md"
                        variant="secondary"
                        disabled={busy[`post-${post.id}`] === "saving"}
                        onClick={() =>
                          updatePost(post.id, {
                            status:
                              post.status === "hidden" ? "published" : "hidden",
                          })
                        }
                      >
                        {post.status === "hidden" ? "Mostrar" : "Ocultar"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "invitaciones" ? (
        <section className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">
              Solicitudes de acceso
            </h3>
            {accessRequests && accessRequests.length > 0 ? (
              <div className="overflow-hidden rounded-4xl border border-blush-100 glass">
                {accessRequests.map((requestItem) => (
                  <div
                    key={requestItem.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-blush-100 px-5 py-4 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {requestItem.email}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Solicitud del{" "}
                        {new Date(requestItem.createdAt).toLocaleDateString("es")}
                      </p>
                    </div>
                    <Button
                      size="md"
                      disabled={busy[`req-${requestItem.id}`] === "inviting"}
                      onClick={() => inviteRequest(requestItem.id)}
                    >
                      {busy[`req-${requestItem.id}`] === "inviting" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Invitar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-4xl border border-dashed border-blush-200 glass px-6 py-8 text-center text-sm text-ink-soft">
                No hay solicitudes pendientes.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">
              Invitar por correo
            </h3>
            <form
              onSubmit={sendInvite}
              className="flex flex-wrap items-end gap-3 rounded-4xl border border-blush-100 glass p-4"
            >
              <div className="min-w-56 flex-1">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="cliente@correo.com"
                  required
                />
              </div>
              <Button type="submit" loading={inviting}>
                <Mail className="h-4 w-4" />
                Enviar invitación
              </Button>
            </form>
            {inviteResult?.error ? (
              <div className="mt-3">
                <FormError>{inviteResult.error}</FormError>
              </div>
            ) : null}
            {inviteResult?.ok ? (
              <p className="mt-3 rounded-2xl glass-soft px-4 py-3 text-sm text-ink-soft">
                Invitación enviada.{" "}
                {inviteResult.preview ? (
                  <a
                    href={inviteResult.preview}
                    className="font-semibold text-blush-600 underline"
                  >
                    Enlace de desarrollo
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-ink">
              Historial de invitaciones
            </h3>
            {invitations && invitations.length > 0 ? (
              <div className="overflow-hidden rounded-4xl border border-blush-100 glass">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 border-b border-blush-100 px-5 py-3 text-sm last:border-b-0"
                  >
                    <span className="text-ink">{invite.email}</span>
                    <span className="text-xs text-ink-soft">
                      {invite.usedAt
                        ? "registrado"
                        : new Date(invite.expiresAt) > new Date()
                          ? "pendiente"
                          : "expirada"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-4xl border border-dashed border-blush-200 glass px-6 py-8 text-center text-sm text-ink-soft">
                Sin invitaciones todavía.
              </p>
            )}
          </div>
        </section>
      ) : null}

      <Modal
        open={Boolean(chatOrderId)}
        onOpenChange={(next) => (!next ? setChatOrderId(null) : null)}
        title="Mensajes del pedido"
        description="Conversación con el cliente."
      >
        {chatOrderId ? <OrderChat orderId={chatOrderId} /> : null}
      </Modal>

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

function OrderFilterFields({
  stacked,
  status,
  setStatus,
  from,
  setFrom,
  to,
  setTo,
  sort,
  setSort,
}) {
  const selectClass = cn(
    "rounded-2xl border border-blush-200 glass-soft px-3 py-3 text-sm font-semibold text-ink",
    stacked && "w-full",
  );

  return (
    <div className={stacked ? "space-y-4" : "flex flex-wrap items-end gap-3"}>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink">
          Estado
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={selectClass}
        >
          <option value="all">Todos</option>
          {ORDER_STATUS.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {STATUS_LABEL[statusOption]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink">
          Desde
        </label>
        <Input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink">
          Hasta
        </label>
        <Input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink">
          Orden
        </label>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className={selectClass}
        >
          <option value="recent">Más recientes</option>
          <option value="old">Más antiguos</option>
        </select>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-4xl border border-blush-100 glass p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blush-100 text-blush-600">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs text-ink-soft">{label}</p>
      <p className="text-2xl font-extrabold text-ink">{value}</p>
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
    await apiFetch("/api/admin/credits", {
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
