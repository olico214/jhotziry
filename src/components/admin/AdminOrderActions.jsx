"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Download, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { TRIPO_COST_MODEL, TRIPO_COST_PARTS } from "@/lib/config";

const FALLBACK_STATUSES = [
  { value: "new", label: "Nuevo" },
  { value: "generating", label: "Generando modelo" },
  { value: "ready", label: "Modelo listo" },
  { value: "confirmed", label: "Confirmado por cliente" },
  { value: "failed", label: "Error" },
  { value: "done", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

const MODES = [
  { value: "textured", label: "Texturizado", cost: TRIPO_COST_MODEL },
  { value: "parts", label: "Partes (sin color)", cost: TRIPO_COST_PARTS },
  {
    value: "both",
    label: "Ambos",
    cost: TRIPO_COST_MODEL + TRIPO_COST_PARTS,
  },
];

export function AdminOrderActions({
  orderId,
  draftId,
  status: initialStatus,
  hasModel,
  hasParts,
  statuses = [],
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const options =
    statuses.length > 0
      ? statuses.map((item) => ({ value: item.key, label: item.label }))
      : FALLBACK_STATUSES;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(
    hasModel && !hasParts ? "parts" : "textured",
  );

  const selected = MODES.find((item) => item.value === mode) || MODES[0];

  const pollJob = async (jobId) => {
    for (let i = 0; i < 240; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const response = await apiFetch(`/api/jobs/${jobId}`, {
        cache: "no-store",
      });
      if (!response.ok) break;
      const data = await response.json();
      if (data.status === "succeeded" || data.status === "failed") {
        return data.status;
      }
    }
    return "timeout";
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const response = await apiFetch(`/api/admin/orders/${orderId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const jobIds = data.jobIds || [];
        await Promise.all(jobIds.map((jobId) => pollJob(jobId)));
        router.refresh();
      }
    } finally {
      setGenerating(false);
    }
  };

  const changeStatus = async (value) => {
    setStatus(value);
    setSaving(true);
    try {
      await apiFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-4xl border border-blush-200 glass-soft p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Acciones de admin
      </span>

      {hasModel ? (
        <a href={`/api/files/${draftId}`} download={`modelo-${draftId}.glb`}>
          <Button size="md">
            <Download className="h-4 w-4" />
            Descargar GLB
          </Button>
        </a>
      ) : null}

      {hasParts ? (
        <a
          href={`/api/files/${draftId}?kind=parts`}
          download={`partes-${draftId}.glb`}
        >
          <Button size="md" variant="secondary">
            <Boxes className="h-4 w-4" />
            Descargar partes
          </Button>
        </a>
      ) : null}

      <select
        value={mode}
        disabled={generating}
        onChange={(event) => setMode(event.target.value)}
        className="rounded-full border border-blush-200 glass px-3 py-2 text-xs font-semibold text-ink"
      >
        {MODES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <Button size="md" onClick={generate} disabled={generating}>
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        Generar 3D
      </Button>

      <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold text-blush-700">
        ≈ {selected.cost} créditos Tripo
      </span>

      <select
        value={status}
        onChange={(event) => changeStatus(event.target.value)}
        className="rounded-full border border-blush-200 glass px-3 py-2 text-xs font-semibold text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {saving ? (
        <RefreshCw className="h-4 w-4 animate-spin text-blush-400" />
      ) : null}
    </div>
  );
}
