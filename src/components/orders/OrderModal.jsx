"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label, Textarea } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";

export function OrderModal({ open, onOpenChange, draftId, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          name: form.get("name"),
          email: form.get("email"),
          address: form.get("address"),
          description: form.get("description"),
          quantity: form.get("quantity"),
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
      title="Solicitar mi pieza impresa"
      description="Usamos tus datos de registro. Si es un regalo, cambia el nombre y el domicilio."
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
            <Label htmlFor="order-name">Recibe</Label>
            <Input
              id="order-name"
              name="name"
              required
              defaultValue={user?.fullName || ""}
              placeholder="Ana Pérez"
            />
          </div>

          <div>
            <Label htmlFor="order-address">Domicilio de entrega</Label>
            <Input
              id="order-address"
              name="address"
              required
              defaultValue={user?.address || ""}
              placeholder="Calle, número, colonia, ciudad, CP"
            />
          </div>

          <div>
            <Label htmlFor="order-email">Correo</Label>
            <Input
              id="order-email"
              name="email"
              type="email"
              required
              defaultValue={user?.email || ""}
            />
          </div>

          <div>
            <Label htmlFor="order-description">Descripción del pedido</Label>
            <Textarea
              id="order-description"
              name="description"
              rows={3}
              placeholder="Tamaño, material, color y cualquier detalle de lo que quieres."
            />
          </div>

          <div>
            <Label htmlFor="order-quantity">Cantidad</Label>
            <Input
              id="order-quantity"
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
            />
          </div>

          <div>
            <Label htmlFor="order-notes">Notas (opcional)</Label>
            <Textarea
              id="order-notes"
              name="notes"
              rows={2}
              placeholder="Instrucciones adicionales"
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
