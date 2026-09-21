"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";

const COPY = {
  login: {
    title: "Inicia sesión",
    description:
      "Te enviamos un enlace mágico a tu correo. Al entrar usas tus créditos y ves tus diseños.",
    action: "Enviarme el enlace",
  },
  signup: {
    title: "Crea tu cuenta",
    description:
      "Escribe tu correo y te enviamos un enlace. Recibes créditos de bienvenida y puedes empezar a crear.",
    action: "Crear mi cuenta",
  },
};

export function AuthModal({ open, onOpenChange, mode = "login" }) {
  const copy = COPY[mode] || COPY.login;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const email = new FormData(event.currentTarget).get("email");

    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos enviar el enlace");
      setSent({ email, preview: data.preview });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setSent(null);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={copy.title}
      description={copy.description}
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blush-100 text-blush-600">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-soft">
            Enviamos el enlace a <strong className="text-ink">{sent.email}</strong>.
            Ábrelo desde este dispositivo para conservar tu diseño.
          </p>
          {sent.preview ? (
            <div className="rounded-2xl bg-blush-50 p-3 text-xs text-ink-soft">
              No se pudo enviar el correo (SMTP). Usa este enlace de desarrollo:
              <a
                href={sent.preview}
                className="mt-2 block break-all font-semibold text-blush-600 underline"
              >
                {sent.preview}
              </a>
            </div>
          ) : null}
          <Button className="w-full" onClick={() => handleOpenChange(false)}>
            Entendido
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="auth-email">Tu correo</Label>
            <Input
              id="auth-email"
              name="email"
              type="email"
              required
              placeholder="tu@correo.com"
            />
          </div>
          <FormError>{error}</FormError>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {copy.action}
          </Button>
        </form>
      )}
    </Modal>
  );
}
