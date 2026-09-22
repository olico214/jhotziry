"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const examples = [
  "de astronauta",
  "con corona y capa de superhéroe",
  "estilo acuarela suave",
];

export function ImageDropzone({ onGenerate, busy }) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");

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
    disabled: busy,
  });

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-4xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragActive
            ? "border-blush-400 glass-soft"
            : "border-blush-200 glass-soft hover:border-blush-300",
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
              ? "La convertiremos en una caricatura parecida"
              : "De tu mascota, un ser querido o tu propio dibujo"}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink">
          Personaliza (opcional)
        </label>
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          maxLength={500}
          disabled={busy}
          placeholder="Cuéntanos cambios: “de astronauta”, “con sombrero y globos”, “estilo acuarela”…"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="rounded-full border border-blush-200 glass px-3 py-1.5 text-xs text-ink-soft transition-colors hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">
          Si lo dejas vacío, haremos una caricatura por defecto. Se suma al estilo
          Caricatura.
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!file || busy}
        onClick={() => file && onGenerate(file, prompt.trim())}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {busy ? "Generando…" : "Convertir a caricatura"}
      </Button>

      {busy ? (
        <p className="rounded-2xl glass-soft px-4 py-3 text-xs text-ink-soft">
          Estamos creando tu imagen. Te avisaremos por correo cuando esté lista.
        </p>
      ) : null}
    </div>
  );
}
