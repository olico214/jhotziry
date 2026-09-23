"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Download, Loader2, RefreshCw, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { TRIPO_COST_MODEL, TRIPO_COST_PARTS } from "@/lib/config";
import { cn } from "@/lib/utils";

const FALLBACK_STATUSES = [
  { value: "new", label: "Nuevo" },
  { value: "generating", label: "Generando modelo" },
  { value: "ready", label: "Modelo listo" },
  { value: "confirmed", label: "Confirmado por cliente" },
  { value: "failed", label: "Error" },
  { value: "received", label: "Recibido" },
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
  scheduledStatus = null,
  scheduledStatusAt = null,
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const options =
    statuses.length > 0
      ? statuses.map((item) => ({ value: item.key, label: item.label }))
      : FALLBACK_STATUSES;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const busyRef = useRef(false);
  const [mode, setMode] = useState(
    hasModel && !hasParts ? "parts" : "textured",
  );
  const [scheduleStatus, setScheduleStatus] = useState(
    () => statuses[0]?.key || "",
  );
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState(null);

  const selected = MODES.find((item) => item.value === mode) || MODES[0];
  const scheduledLabel =
    options.find((item) => item.value === scheduledStatus)?.label ||
    scheduledStatus;

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
    if (busyRef.current) return;
    busyRef.current = true;
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
      busyRef.current = false;
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

  const schedule = async () => {
    if (!scheduleAt) return;
    setScheduling(true);
    setScheduleMsg(null);
    try {
      const response = await apiFetch(`/api/admin/orders/${orderId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: scheduleStatus,
          at: new Date(scheduleAt).toISOString(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setScheduleMsg(data.error || "No se pudo programar");
        return;
      }
      setScheduleAt("");
      router.refresh();
    } finally {
      setScheduling(false);
    }
  };

  const cancelSchedule = async () => {
    setScheduling(true);
    try {
      await apiFetch(`/api/admin/orders/${orderId}/schedule`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-4xl border border-blush-200 glass-soft p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Acciones de admin
        </span>

        {hasModel ? (
          <a
            href={`/api/files/${draftId}`}
            download={`modelo-${draftId}.glb`}
            className={cn(generating && "pointer-events-none opacity-60")}
          >
            <Button size="md" disabled={generating}>
              <Download className="h-4 w-4" />
              Descargar GLB
            </Button>
          </a>
        ) : null}

        {hasParts ? (
          <a
            href={`/api/files/${draftId}?kind=parts`}
            download={`partes-${draftId}.glb`}
            className={cn(generating && "pointer-events-none opacity-60")}
          >
            <Button size="md" variant="secondary" disabled={generating}>
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
          {generating ? "Generando…" : "Generar 3D"}
        </Button>

        <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold text-blush-700">
          ≈ {selected.cost} créditos Tripo
        </span>

        <select
          value={status}
          disabled={generating}
          onChange={(event) => changeStatus(event.target.value)}
          className="rounded-full border border-blush-200 glass px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60"
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

      <div className="flex flex-wrap items-center gap-3 border-t border-blush-100 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Programar cambio
        </span>

        {scheduledStatus ? (
          <>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              {scheduledLabel} ·{" "}
              {new Date(scheduledStatusAt).toLocaleString("es")}
            </span>
            <Button
              size="icon"
              variant="secondary"
              onClick={cancelSchedule}
              disabled={scheduling}
              title="Cancelar programación"
            >
              {scheduling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </>
        ) : (
          <>
            <select
              value={scheduleStatus}
              onChange={(event) => setScheduleStatus(event.target.value)}
              className="rounded-full border border-blush-200 glass px-3 py-2 text-xs font-semibold text-ink"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              className="rounded-full border border-blush-200 glass px-3 py-2 text-xs font-semibold text-ink"
            />
            <Button
              size="md"
              variant="secondary"
              onClick={schedule}
              disabled={scheduling || !scheduleAt}
            >
              {scheduling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Programar
            </Button>
            {scheduleMsg ? (
              <span className="text-xs font-semibold text-red-500">
                {scheduleMsg}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
