"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ViewerCanvas = dynamic(() => import("./ViewerCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-blush-400" />
    </div>
  ),
});

export function ModelViewer({ modelUrl, status, progress }) {
  return (
    <div className="relative h-full min-h-[340px] w-full overflow-hidden rounded-4xl border border-blush-100 bg-blush-50 shadow-inner">
      <ViewerCanvas modelUrl={modelUrl} />

      {status === "generating" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm">
          <p className="text-sm font-semibold text-ink">
            Dando forma a tu idea…
          </p>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-blush-100">
            <div
              className="h-full rounded-full bg-blush-400 transition-all duration-500"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
          <p className="text-xs text-ink-soft">{progress}%</p>
        </div>
      ) : null}

      {status === "idle" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
          <p className="rounded-full bg-white/80 px-4 py-2 text-xs text-ink-soft">
            Tu boceto 3D aparecerá aquí
          </p>
        </div>
      ) : null}
    </div>
  );
}
