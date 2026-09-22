import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orderEvents, orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";

const schema = z.object({
  status: z.enum(["new", "generating", "ready", "failed", "done", "cancelled"]),
});

export async function PATCH(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const { id } = await ctx.params;

  const [updated] = await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });

  if (!updated) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  await db.insert(orderEvents).values({
    orderId: id,
    status: parsed.data.status,
    note: "Estado actualizado por el administrador",
  });

  return NextResponse.json({ ok: true });
}
