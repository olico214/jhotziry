import { ImageIcon } from "lucide-react";

export function DraftImageCard({ draft }) {
  const version = new Date(draft.updatedAt).getTime();
  const src = `/api/preview/${draft.id}?v=${version}`;

  return (
    <article className="overflow-hidden rounded-4xl border border-blush-100 bg-white/70 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-56 items-center justify-center overflow-hidden rounded-3xl bg-blush-50">
        {draft.previewPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={draft.prompt || "Diseño"}
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-blush-300" />
        )}
      </div>
      <div className="mt-3 px-1">
        <p className="line-clamp-2 text-sm font-semibold text-ink">
          {draft.prompt || "Creado desde una foto"}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          {draft.mode === "image" ? "Foto" : "Texto a imagen"} ·{" "}
          {new Date(draft.createdAt).toLocaleDateString("es")}
        </p>
      </div>
    </article>
  );
}
