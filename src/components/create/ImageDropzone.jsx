"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function ImageDropzone({ onGenerate, busy }) {
  const [file, setFile] = useState(null);

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-4xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragActive
            ? "border-blush-400 bg-blush-50"
            : "border-blush-200 bg-blush-50/40 hover:border-blush-300",
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Vista previa"
            className="h-32 w-32 rounded-3xl object-cover shadow-md"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blush-200 text-blush-700">
            <ImagePlus className="h-6 w-6" />
          </span>
        )}
        <div>
          <p className="text-sm font-semibold text-ink">
            {file ? file.name : "Arrastra y suelta una foto"}
          </p>
          <p className="text-xs text-ink-soft">
            {file
              ? "Puedes cambiarla soltando otra"
              : "De tu mascota, un ser querido o tu propio dibujo"}
          </p>
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!file}
        onClick={() => file && onGenerate(file)}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Usar esta foto
      </Button>

      {busy ? (
        <p className="rounded-2xl bg-blush-50 px-4 py-3 text-xs text-ink-soft">
          Puedes seguir creando mientras esperamos. Te avisaremos por correo
          cuando tu vista previa esté lista.
        </p>
      ) : null}
    </div>
  );
}
