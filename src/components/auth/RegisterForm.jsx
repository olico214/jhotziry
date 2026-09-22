"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api-client";

export function RegisterForm({ token, email }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fullName: form.get("fullName"),
          address: form.get("address"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No pudimos completar el registro");

      router.push("/crear");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reg-email">Correo</Label>
        <Input id="reg-email" value={email} readOnly />
      </div>

      <div>
        <Label htmlFor="reg-name">Nombre completo</Label>
        <Input
          id="reg-name"
          name="fullName"
          required
          placeholder="Ana Pérez López"
        />
      </div>

      <div>
        <Label htmlFor="reg-address">Domicilio</Label>
        <Input
          id="reg-address"
          name="address"
          required
          placeholder="Calle, número, colonia, ciudad, CP"
        />
      </div>

      <FormError>{error}</FormError>

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Completar registro
      </Button>
    </form>
  );
}
