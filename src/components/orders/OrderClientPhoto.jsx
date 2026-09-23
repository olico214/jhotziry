"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function OrderClientPhoto({ orderId, canUpload, photoUrl }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await apiFetch(`/api/orders/${orderId}/photo`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "No se pudo subir la foto");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo subir la foto");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-bold text-ink">Foto de recibido</h2>

      {photoUrl ? (
        <div className="overflow-hidden rounded-4xl border border-blush-100 glass-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Foto de recibido"
            loading="lazy"
            decoding="async"
            className="max-h-[420px] w-full object-contain"
          />
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          Aún no hay foto de recibido.
        </p>
      )}

      {canUpload ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={upload}
            disabled={uploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-blush-200 glass px-4 py-2 text-sm font-semibold text-ink transition-colors hover:text-blush-600",
              uploading && "opacity-60",
            )}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {photoUrl ? "Reemplazar foto" : "Subir foto"}
          </button>
          <span className="text-xs text-ink-soft">
            Al subir la foto, el pedido pasa a Completado.
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
      ) : null}
    </section>
  );
}
