"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { CREDITS_PER_IDEA } from "@/lib/config";

const STYLE_LABEL = {
  realistic: "Realista",
  anime: "Anime",
  cartoon: "Caricatura",
};

export function MagicIdeaModal({
  open,
  onOpenChange,
  initialIdea,
  style,
  onExpand,
  onUse,
}) {
  const [idea, setIdea] = useState(initialIdea || "");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (idea.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const data = await onExpand(idea.trim());
      if (data?.error) {
        setError(data.error);
        return;
      }
      setResult(data.text || "");
    } finally {
      setBusy(false);
    }
  };

  const use = () => {
    onUse(result || idea);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Botón mágico"
      description={`Escribe tu idea y la convertimos en una descripción detallada en estilo ${
        STYLE_LABEL[style] || "Caricatura"
      }. Cuesta ${CREDITS_PER_IDEA} crédito.`}
    >
      <div className="space-y-4">
        <Textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ej: mi gato durmiendo en un sofá"
        />

        <Button
          type="button"
          size="lg"
          className="w-full"
          loading={busy}
          disabled={idea.trim().length < 3}
          onClick={generate}
        >
          <Wand2 className="h-4 w-4" />
          Generar idea ({CREDITS_PER_IDEA} crédito)
        </Button>

        <FormError>{error}</FormError>

        {result ? (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-3xl border border-blush-100 glass-soft px-4 py-3 text-sm text-ink">
              {result}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:flex-1"
                onClick={generate}
                disabled={busy}
              >
                <Wand2 className="h-4 w-4" />
                Otra versión
              </Button>
              <Button
                type="button"
                className="w-full sm:flex-1"
                onClick={use}
              >
                Usar esta idea
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
