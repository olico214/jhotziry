"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label, Textarea } from "@/components/ui/Field";

const ORDER_COPY = {
  title: "Solicitar mi pieza impresa",
  description:
    "Nos pondremos en contacto para confirmar tamaño, material, precio y envío. Convertiremos tu imagen en el modelo 3D al confirmar el pedido.",
};

export function OrderModal({ open, onOpenChange, draftId, defaultEmail }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          name: form.get("name"),
          email: form.get("email"),
          notes: form.get("notes"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No pudimos enviar el pedido");
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
    }
    onOpenChange(next);
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={ORDER_COPY.title}
      description={ORDER_COPY.description}
    >
      {done ? (
        <div className="space-y-5 text-center">
          <p className="text-4xl">🎁</p>
          <p className="text-sm text-ink-soft">
            ¡Pedido recibido! Te escribiremos para coordinar los detalles.
          </p>
          <Button className="w-full" onClick={() => handleOpenChange(false)}>
            Listo
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="order-name">Tu nombre</Label>
            <Input id="order-name" name="name" required placeholder="Ana Pérez" />
          </div>

          <div>
            <Label htmlFor="order-email">Correo</Label>
            <Input
              id="order-email"
              name="email"
              type="email"
              required
              defaultValue={defaultEmail || ""}
              placeholder="ana@correo.com"
            />
          </div>

          <div>
            <Label htmlFor="order-notes">Detalles (tamaño, color, uso)</Label>
            <Textarea
              id="order-notes"
              name="notes"
              rows={3}
              placeholder="Quiero una figura de unos 10 cm, en color rosa, para regalo."
            />
          </div>

          <FormError>{error}</FormError>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Enviar pedido
          </Button>
        </form>
      )}
    </Modal>
  );
}
