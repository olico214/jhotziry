"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const ViewerCanvas = dynamic(() => import("@/components/create/ViewerCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-blush-400" />
    </div>
  ),
});

const MODES = [
  { id: "textured", label: "Texturizado", soon: false },
  { id: "wireframe", label: "Wireframe", soon: false },
  { id: "clay", label: "Arcilla", soon: true },
  { id: "resin", label: "Resina", soon: true },
];

export function AdminModelViewer({ draftId, version }) {
  const [mode, setMode] = useState("textured");
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  const modelUrl = `/api/files/${draftId}?v=${version}`;

  return (
    <div className="space-y-3">
      <div className="h-80 overflow-hidden rounded-4xl border border-blush-100 glass-soft">
        <ViewerCanvas
          key={resetKey}
          modelUrl={modelUrl}
          materialMode={mode}
          autoRotate={autoRotate}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((item) => {
          const active = mode === item.id && !item.soon;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.soon}
              onClick={() => !item.soon && setMode(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-blush-400 bg-blush-100 text-blush-700"
                  : "border-blush-200 glass text-ink-soft",
                item.soon && "cursor-not-allowed opacity-60",
              )}
            >
              {item.label}
              {item.soon ? (
                <span className="rounded-full bg-blush-200/70 px-1.5 py-0.5 text-[10px] text-blush-700">
                  Pronto
                </span>
              ) : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAutoRotate((value) => !value)}
          className="rounded-full border border-blush-200 glass px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          {autoRotate ? "Pausar giro" : "Girar"}
        </button>
        <button
          type="button"
          onClick={() => setResetKey((key) => key + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 glass px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar
        </button>
      </div>

      <p className="text-xs text-ink-soft">
        Vista del modelo tal como se generó. Arcilla y Resina (para imprimir sin
        color) estarán disponibles próximamente.
      </p>
    </div>
  );
}
