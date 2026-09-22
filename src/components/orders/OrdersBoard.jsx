"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "new", label: "Recibido" },
  { id: "generating", label: "Preparando" },
  { id: "ready", label: "Listo" },
  { id: "failed", label: "Revisión" },
  { id: "done", label: "Completado" },
  { id: "cancelled", label: "Cancelado" },
];

const STATUS_LABEL = {
  new: "Recibido",
  generating: "Preparando el modelo",
  ready: "Modelo listo",
  failed: "Revisión manual",
  done: "Completado",
  cancelled: "Cancelado",
};

export function OrdersBoard({ orders }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilters =
    (status !== "all" ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0) +
    (sort !== "recent" ? 1 : 0);

  const clearFilters = () => {
    setStatus("all");
    setFrom("");
    setTo("");
    setSort("recent");
  };

  const counts = useMemo(() => {
    const base = { total: orders.length, active: 0, ready: 0, done: 0 };
    for (const order of orders) {
      if (order.status === "new" || order.status === "generating") base.active += 1;
      if (order.status === "ready") base.ready += 1;
      if (order.status === "done") base.done += 1;
    }
    return base;
  }, [orders]);

  const filtered = useMemo(() => {
    const texto = query.trim().toLowerCase();

    const list = orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (from && order.createdAt < from) return false;
      if (to && order.createdAt > `${to}T23:59:59`) return false;
      if (texto) {
        const hay = `${order.name} ${order.description || ""} ${
          order.address || ""
        } ${order.email}`.toLowerCase();
        if (!hay.includes(texto)) return false;
      }
      return true;
    });

    list.sort((a, b) =>
      sort === "recent"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );

    return list;
  }, [orders, status, query, from, to, sort]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={counts.total} />
        <Stat label="En proceso" value={counts.active} />
        <Stat label="Listos" value={counts.ready} />
        <Stat label="Completados" value={counts.done} />
      </div>

      {/* Búsqueda + filtros en modal */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar pedido"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="relative inline-flex items-center gap-2 rounded-2xl border border-blush-200 glass px-4 text-sm font-semibold text-ink"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilters > 0 ? (
            <span className="rounded-full bg-blush-500 px-1.5 text-xs text-white">
              {activeFilters}
            </span>
          ) : null}
        </button>
      </div>

      <Modal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtros"
        description="Elige qué pedidos quieres ver."
      >
        <div className="space-y-4">
          <FilterFields
            stacked
            status={status}
            setStatus={setStatus}
            from={from}
            setFrom={setFrom}
            to={to}
            setTo={setTo}
            sort={sort}
            setSort={setSort}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={clearFilters}
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => setFiltersOpen(false)}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>

      {filtered.length === 0 ? (
        <p className="rounded-4xl border border-dashed border-blush-200 glass px-6 py-12 text-center text-sm text-ink-soft">
          No hay pedidos que coincidan con los filtros.
        </p>
      ) : (
        <div className="overflow-hidden rounded-4xl border border-blush-100 glass">
          {filtered.map((order) => (
            <Link
              key={order.id}
              href={`/mis-pedidos/${order.id}`}
              className="flex flex-wrap items-center gap-4 border-b border-blush-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-blush-50/60"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-blush-100 glass-soft">
                {order.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.previewUrl}
                    alt={order.description || "Producto"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-6 w-6 text-blush-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Package className="h-4 w-4 text-blush-500" />
                  {order.description || "Pieza impresa"}
                  <span className="text-xs font-normal text-ink-soft">
                    ×{order.quantity ?? 1}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {order.name}
                  {order.address ? ` · ${order.address}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {new Date(order.createdAt).toLocaleString("es")}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  order.status === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : order.status === "failed"
                      ? "bg-red-50 text-red-600"
                      : "bg-blush-100 text-blush-700",
                )}
              >
                {STATUS_LABEL[order.status] || order.status}
              </span>
              <ChevronRight className="h-4 w-4 text-blush-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterFields({
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
          {STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
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

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border border-blush-100 glass px-4 py-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
