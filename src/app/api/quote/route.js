import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { quoteRequests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { extensionFor, saveBuffer } from "@/lib/storage/files";

const MAX_BYTES = 8 * 1024 * 1024;

const schema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(120),
  email: z.string().trim().email("Correo no válido"),
  message: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más de tu idea")
    .max(2000),
});

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("quote", guard.user.id, 5, 60 * 60 * 1000);
  if (limited) return limited;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  if (String(form.get("website") || "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const parsed = schema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    message: form.get("message"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  let filePath = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera los 8 MB" },
        { status: 413 },
      );
    }
    const marker = globalThis.crypto?.randomUUID?.() || Date.now().toString(36);
    filePath = `quotes/${marker}${extensionFor(file)}`;
    await saveBuffer(filePath, Buffer.from(await file.arrayBuffer()));
  }

  const [created] = await db
    .insert(quoteRequests)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      filePath,
    })
    .returning({ id: quoteRequests.id });

  return NextResponse.json({ ok: true, id: created.id });
}
