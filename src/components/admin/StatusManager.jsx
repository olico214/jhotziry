"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

function StatusRow({
  status,
  statuses,
  onChanged,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  isOver,
}) {
  const [label, setLabel] = useState(status.label);
  const [dragArmed, setDragArmed] = useState(false);
  const [clientCanEditModel, setClientCanEditModel] = useState(
    status.clientCanEditModel,
  );
  const [clientUploadsPhoto, setClientUploadsPhoto] = useState(
    status.clientUploadsPhoto,
  );
  const [clientPhotoNextStatus, setClientPhotoNextStatus] = useState(
    status.clientPhotoNextStatus || "",
  );
  const [active, setActive] = useState(status.active);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const dirty =
    label.trim() !== status.label ||
    clientCanEditModel !== status.clientCanEditModel ||
    clientUploadsPhoto !== status.clientUploadsPhoto ||
    (clientPhotoNextStatus || null) !== (status.clientPhotoNextStatus || null) ||
    active !== status.active;

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await apiFetch(`/api/admin/order-statuses/${status.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          clientCanEditModel,
          clientUploadsPhoto,
          clientPhotoNextStatus: clientPhotoNextStatus || null,
          active,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFeedback(data.error || "No se pudo guardar");
        return;
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await apiFetch(`/api/admin/order-statuses/${status.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFeedback(data.error || "No se pudo eliminar");
        return;
      }
      onChanged();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      draggable={dragArmed}
      onDragStart={onDragStart}
      onDragEnd={() => {
        setDragArmed(false);
        onDragEnd?.();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-blush-100 px-4 py-3 transition-colors last:border-b-0",
        isDragging && "opacity-50",
        isOver && "bg-blush-50",
      )}
    >
      <span
        onMouseDown={() => setDragArmed(true)}
        onMouseUp={() => setDragArmed(false)}
        onTouchStart={() => setDragArmed(true)}
        onTouchEnd={() => setDragArmed(false)}
        title="Arrastra para ordenar"
        className="cursor-grab touch-none text-ink-soft active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </span>

      <Input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        className="w-44"
      />

      <code className="rounded-full bg-blush-50 px-3 py-1 text-xs font-semibold text-ink-soft">
        {status.key}
        {status.isSystem ? " · sistema" : ""}
      </code>

      <label
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft"
        title="Si lo marcas, el cliente puede pintar/cambiar los colores de las partes cuando el pedido esté en este estado (girar y hacer zoom siempre está disponible)"
      >
        <input
          type="checkbox"
          checked={clientCanEditModel}
          onChange={(event) => setClientCanEditModel(event.target.checked)}
          className="h-4 w-4 accent-blush-500"
        />
        Cliente puede pintar el 3D
      </label>

      <label
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft"
        title="Si lo marcas, el cliente puede subir una foto en este estado; al subirla el pedido pasa al estado siguiente"
      >
        <input
          type="checkbox"
          checked={clientUploadsPhoto}
          onChange={(event) => setClientUploadsPhoto(event.target.checked)}
          className="h-4 w-4 accent-blush-500"
        />
        Cliente sube foto
      </label>

      {clientUploadsPhoto ? (
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          Pasa a
          <select
            value={clientPhotoNextStatus}
            onChange={(event) => setClientPhotoNextStatus(event.target.value)}
            className="rounded-xl border border-blush-200 glass px-2 py-1 text-xs font-semibold text-ink"
          >
            <option value="">— Ninguno —</option>
            {statuses
              .filter((item) => item.key !== status.key)
              .map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
      ) : null}

      <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-4 w-4 accent-blush-500"
        />
        Activo
      </label>

      {feedback ? (
        <span className="text-xs font-semibold text-red-500">{feedback}</span>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={save}
          disabled={!dirty || saving}
          title="Guardar"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
        {status.isSystem ? null : (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            title="Eliminar"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border border-blush-200 glass text-ink-soft transition-colors hover:text-red-500",
              deleting && "opacity-60",
            )}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function StatusManager({ statuses = [] }) {
  const router = useRouter();
  const signature = JSON.stringify(
    statuses.map((status) => [
      status.id,
      status.label,
      status.sortOrder,
      status.active,
      status.clientCanEditModel,
      status.clientUploadsPhoto,
      status.clientPhotoNextStatus,
    ]),
  );
  const [items, setItems] = useState(statuses);
  const [localSignature, setLocalSignature] = useState(signature);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [label, setLabel] = useState("");
  const [clientCanEditModel, setClientCanEditModel] = useState(false);
  const [clientUploadsPhoto, setClientUploadsPhoto] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  if (localSignature !== signature) {
    setLocalSignature(signature);
    setItems(statuses);
  }

  const refresh = () => router.refresh();

  const persistOrder = async (next) => {
    setReordering(true);
    try {
      const response = await apiFetch("/api/admin/order-statuses/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((item) => item.id) }),
      });
      if (!response.ok) {
        setItems(statuses);
        return;
      }
      refresh();
    } finally {
      setReordering(false);
    }
  };

  const handleDrop = (index) => {
    if (dragIndex === null) return;
    setOverIndex(null);
    if (dragIndex === index) {
      setDragIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setItems(next);
    setDragIndex(null);
    persistOrder(next);
  };

  const create = async () => {
    if (!label.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const response = await apiFetch("/api/admin/order-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          clientCanEditModel,
          clientUploadsPhoto,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "No se pudo crear el estado");
        return;
      }
      setLabel("");
      setClientCanEditModel(false);
      setClientUploadsPhoto(false);
      refresh();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-4xl border border-blush-100 glass p-5">
        <h3 className="text-sm font-bold text-ink">Nuevo estado</h3>
        <p className="mt-1 text-xs text-ink-soft">
          Los estados del sistema (Nuevo, Generando modelo, Modelo listo,
          Confirmado por cliente, Error) no se pueden eliminar. Arrastra las
          filas con el ícono ⠿ para cambiar el orden. &quot;Cliente puede pintar
          el 3D&quot; permite cambiar los colores de las partes; &quot;Cliente
          sube foto&quot; permite subir una foto que avanza al estado que elijas.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ej. En producción"
            className="w-52"
          />
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={clientCanEditModel}
              onChange={(event) => setClientCanEditModel(event.target.checked)}
              className="h-4 w-4 accent-blush-500"
            />
            Cliente puede pintar el 3D
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={clientUploadsPhoto}
              onChange={(event) => setClientUploadsPhoto(event.target.checked)}
              className="h-4 w-4 accent-blush-500"
            />
            Cliente sube foto
          </label>
          <Button onClick={create} disabled={creating || !label.trim()}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Agregar
          </Button>
          {reordering ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Guardando orden…
            </span>
          ) : null}
        </div>
        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-4xl border border-blush-100 glass">
        {items.map((status, index) => (
          <StatusRow
            key={status.id}
            status={status}
            statuses={items}
            onChanged={refresh}
            isDragging={dragIndex === index}
            isOver={overIndex === index && dragIndex !== index}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (overIndex !== index) setOverIndex(index);
            }}
            onDrop={() => handleDrop(index)}
          />
        ))}
      </div>
    </div>
  );
}
