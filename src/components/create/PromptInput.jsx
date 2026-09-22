"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

const examples = [
  "Un zorrito kawaii sentado, estilo caricatura",
  "Mi perro como superhéroe con capa",
  "Un llavero con forma de nube sonriente",
];

export function PromptInput({ value, onChange, onGenerate, busy }) {
  const submit = (event) => {
    event.preventDefault();
    if (value.trim().length < 3) return;
    onGenerate(value.trim());
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        maxLength={500}
        placeholder="Describe tu idea: “un dino bebé con gorrito de cumpleaños”"
      />

      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onChange(example)}
            className="rounded-full border border-blush-200 glass px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-blush-300 hover:text-ink"
          >
            {example}
          </button>
        ))}
      </div>

      <Button type="submit" size="lg" className="w-full">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {busy ? "Generar otra imagen" : "Generar vista previa"}
      </Button>

      {busy ? (
        <p className="rounded-2xl glass-soft px-4 py-3 text-xs text-ink-soft">
          Puedes generar otra imagen mientras esperamos. Te avisaremos por correo
          en cuanto la primera esté lista.
        </p>
      ) : null}
    </form>
  );
}
