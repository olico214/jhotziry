import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { getOrderStatusByKey } from "@/lib/orders/statuses";

const schema = z.object({
  partColors: z.record(
    z.string().max(60),
    z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ),
});

export async function PATCH(request, ctx) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Colores inválidos" }, { status: 400 });
  }

  const { id } = await ctx.params;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const isOwner = order.userId === guard.user.id;
  if (!isOwner && !guard.user.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!guard.user.isAdmin) {
    const statusDef = await getOrderStatusByKey(order.status);
    if (!statusDef?.clientCanEditModel) {
      return NextResponse.json(
        { error: "En este estado ya no puedes cambiar los colores." },
        { status: 403 },
      );
    }
  }

  await db
    .update(orders)
    .set({ partColors: parsed.data.partColors, updatedAt: new Date() })
    .where(eq(orders.id, id));

  return NextResponse.json({ ok: true });
}
