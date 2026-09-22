"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label, Textarea } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";

export function QuoteModal({ open, onOpenChange }) {
  const formRef = useRef(null);
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/quote", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Inicia sesión para solicitar tu cotización.");
      }
      if (!response.ok) throw new Error(data.error || "No pudimos enviar la solicitud");
      setDone(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setDone(false);
      setError(null);
      setFileName(null);
    }
    onOpenChange(next);
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Solicitar cotización"
      description="Cuéntanos tu idea o sube un diseño que ya tengas. Te respondemos con precio y tiempos de impresión."
    >
      {done ? (
        <div className="space-y-5 text-center">
          <p className="text-4xl">🎀</p>
          <p className="text-sm text-ink-soft">
            ¡Recibimos tu solicitud! Te escribiremos muy pronto con la cotización.
          </p>
          <Button className="w-full" onClick={() => handleOpenChange(false)}>
            Listo
          </Button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quote-name">Tu nombre</Label>
            <Input id="quote-name" name="name" required placeholder="Ana Pérez" />
          </div>

          <div>
            <Label htmlFor="quote-email">Correo</Label>
            <Input
              id="quote-email"
              name="email"
              type="email"
              required
              placeholder="ana@correo.com"
            />
          </div>

          <div>
            <Label htmlFor="quote-message">¿Qué quieres imprimir?</Label>
            <Textarea
              id="quote-message"
              name="message"
              required
              rows={4}
              placeholder="Quiero una figura de mi perro de unos 10 cm, para regalo."
            />
          </div>

          <div>
            <Label htmlFor="quote-file">Diseño propio (opcional)</Label>
            <label
              htmlFor="quote-file"
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-blush-300 glass-soft px-4 py-3 text-sm text-ink-soft transition-colors hover:border-blush-400 hover:bg-blush-50"
            >
              <Paperclip className="h-4 w-4 text-blush-500" />
              {fileName || "Adjunta un .stl, .obj, .glb o una foto"}
            </label>
            <input
              id="quote-file"
              name="file"
              type="file"
              className="hidden"
              onChange={(event) =>
                setFileName(event.target.files?.[0]?.name ?? null)
              }
            />
          </div>

          <div className="hidden" aria-hidden="true">
            <label htmlFor="quote-website">No completar</label>
            <input
              id="quote-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <FormError>{error}</FormError>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Enviar solicitud
          </Button>
        </form>
      )}
    </Modal>
  );
}
