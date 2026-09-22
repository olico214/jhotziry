"use client";

import { useState } from "react";
import { MailCheck, Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";

const COPY = {
  login: {
    title: "Inicia sesión",
    description:
      "Escribe tu correo y te enviamos un enlace de acceso. El acceso es por invitación del administrador.",
    action: "Enviarme el enlace",
  },
};

export function AuthModal({ open, onOpenChange, mode = "login" }) {
  const copy = COPY[mode] || COPY.login;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);
  const [requestPanel, setRequestPanel] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/auth/request-link", {
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

  const requestAccess = async () => {
    if (!email.trim()) {
      setError("Escribe tu correo para solicitar acceso.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/auth/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No pudimos enviar la solicitud");
      setRequested(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setSent(null);
      setError(null);
      setRequestPanel(false);
      setRequested(false);
      setEmail("");
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
            Si <strong className="text-ink">{sent.email}</strong> está registrado,
            te enviamos un enlace de acceso.
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
      ) : requestPanel ? (
        <div className="space-y-4">
          {requested ? (
            <>
              <p className="rounded-2xl bg-blush-50 px-4 py-3 text-sm text-ink-soft">
                Listo. Enviamos tu solicitud de acceso para{" "}
                <strong className="text-ink">{email}</strong>. El administrador
                te invitará y recibirás tu enlace de registro.
              </p>
              <Button className="w-full" onClick={() => handleOpenChange(false)}>
                Entendido
              </Button>
            </>
          ) : (
            <>
              <p className="rounded-2xl bg-blush-50 px-4 py-3 text-sm text-ink-soft">
                El acceso es por invitación. Solicítalo y el administrador te
                enviará tu enlace de registro.
              </p>
              <FormError>{error}</FormError>
              <Button
                size="lg"
                className="w-full"
                loading={loading}
                onClick={requestAccess}
              >
                <Send className="h-4 w-4" />
                Solicitar acceso
              </Button>
              <button
                type="button"
                onClick={() => setRequestPanel(false)}
                className="w-full text-center text-xs font-semibold text-ink-soft hover:text-ink"
              >
                Volver
              </button>
            </>
          )}
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <FormError>{error}</FormError>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {copy.action}
          </Button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setRequestPanel(true);
            }}
            className="w-full text-center text-xs font-semibold text-blush-600 hover:underline"
          >
            ¿No tienes cuenta? Solicita acceso
          </button>
        </form>
      )}
    </Modal>
  );
}
