"use client";

export function ImageResult({ previewUrl, status, progress }) {
  return (
    <div className="relative h-full min-h-[340px] w-full overflow-hidden rounded-4xl border border-blush-100 bg-blush-50 shadow-inner">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Vista previa del diseño"
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full items-center justify-center px-8 text-center">
          <p className="text-sm text-ink-soft">
            Aquí verás la vista previa de tu idea, lista para convertirla en un
            objeto impreso.
          </p>
        </div>
      )}

      {status === "generating" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/75 backdrop-blur-sm">
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
    </div>
  );
}
