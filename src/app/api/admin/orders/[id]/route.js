import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orderEvents, orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { getOrderStatusByKey } from "@/lib/orders/statuses";
import { notifyOrderStatusChange } from "@/lib/orders/notify-status";

const schema = z.object({
  status: z.string().trim().min(1).max(40),
});

export async function PATCH(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const statusDef = await getOrderStatusByKey(parsed.data.status);
  if (!statusDef) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const { id } = await ctx.params;

  const [existing] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orders.id, id));

  await db.insert(orderEvents).values({
    orderId: id,
    status: parsed.data.status,
    note: `Estado actualizado: ${statusDef.label}`,
  });

  await notifyOrderStatusChange(
    id,
    parsed.data.status,
    existing.status,
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
