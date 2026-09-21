import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { drafts, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

const schema = z.object({
  draftId: z.string().uuid(),
  name: z.string().trim().min(2, "Escribe tu nombre").max(120),
  email: z.string().trim().email("Correo no válido"),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para continuar" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos" },
      { status: 400 },
    );
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, parsed.data.draftId))
    .limit(1);

  if (!draft || draft.userId !== user.id) {
    return NextResponse.json({ error: "Diseño no encontrado" }, { status: 404 });
  }

  if (!draft.previewPath) {
    return NextResponse.json(
      { error: "Primero genera una vista previa" },
      { status: 400 },
    );
  }

  const [order] = await db
    .insert(orders)
    .values({
      userId: user.id,
      draftId: draft.id,
      name: parsed.data.name,
      email: parsed.data.email,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: orders.id });

  return NextResponse.json({ ok: true, orderId: order.id });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  return NextResponse.json({ orders: rows });
}
