"use client";

import { ModelViewer } from "@/components/create/ModelViewer";

export function DraftCard({ draft }) {
  const version = new Date(draft.updatedAt).getTime();

  return (
    <article className="overflow-hidden rounded-4xl border border-blush-100 bg-white/70 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="h-56">
        <ModelViewer
          modelUrl={`/api/files/${draft.id}?v=${version}`}
          status="ready"
          progress={100}
        />
      </div>
      <div className="mt-3 px-1">
        <p className="line-clamp-2 text-sm font-semibold text-ink">
          {draft.prompt || "Creado desde una imagen"}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          {draft.mode === "image" ? "Imagen a 3D" : "Texto a 3D"} ·{" "}
          {new Date(draft.createdAt).toLocaleDateString("es")}
        </p>
      </div>
    </article>
  );
}
