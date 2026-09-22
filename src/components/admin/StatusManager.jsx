"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

function StatusRow({ status, onChanged }) {
  const [label, setLabel] = useState(status.label);
  const [sortOrder, setSortOrder] = useState(status.sortOrder);
  const [clientCanEditModel, setClientCanEditModel] = useState(
    status.clientCanEditModel,
  );
  const [active, setActive] = useState(status.active);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const dirty =
    label.trim() !== status.label ||
    Number(sortOrder) !== status.sortOrder ||
    clientCanEditModel !== status.clientCanEditModel ||
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
          sortOrder: Number(sortOrder),
          clientCanEditModel,
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
    <div className="flex flex-wrap items-center gap-3 border-b border-blush-100 px-4 py-3 last:border-b-0">
      <Input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        className="w-44"
      />

      <code className="rounded-full bg-blush-50 px-3 py-1 text-xs font-semibold text-ink-soft">
        {status.key}
        {status.isSystem ? " · sistema" : ""}
      </code>

      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
        Orden
        <input
          type="number"
          min="0"
          max="9999"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          className="w-16 rounded-xl border border-blush-200 glass px-2 py-1 text-xs text-ink"
        />
      </label>

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
  const [label, setLabel] = useState("");
  const [clientCanEditModel, setClientCanEditModel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const refresh = () => router.refresh();

  const create = async () => {
    if (!label.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const response = await apiFetch("/api/admin/order-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), clientCanEditModel }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "No se pudo crear el estado");
        return;
      }
      setLabel("");
      setClientCanEditModel(false);
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
          Confirmado por cliente, Error) no se pueden eliminar. Marca
          &quot;Cliente puede pintar el 3D&quot; para permitir cambiar los
          colores de las partes en ese estado; girar, hacer zoom y ver el modelo
          siempre está disponible.
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
          <Button onClick={create} disabled={creating || !label.trim()}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Agregar
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-4xl border border-blush-100 glass">
        {statuses.map((status) => (
          <StatusRow key={status.id} status={status} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}
