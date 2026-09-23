import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { getOrderStatusByKey } from "@/lib/orders/statuses";

const schema = z.object({
  status: z.string().trim().min(1).max(40),
  at: z.string().trim().min(1),
});

export async function POST(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("order:schedule", guard.user.id, 60, 60_000);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const when = new Date(parsed.data.at);
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  if (when.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Elige una fecha futura" },
      { status: 400 },
    );
  }

  const statusDef = await getOrderStatusByKey(parsed.data.status);
  if (!statusDef) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const { id } = await ctx.params;

  const [updated] = await db
    .update(orders)
    .set({ scheduledStatus: statusDef.key, scheduledStatusAt: when })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });

  if (!updated) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: statusDef.key,
    at: when.toISOString(),
  });
}

export async function DELETE(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;

  const [updated] = await db
    .update(orders)
    .set({ scheduledStatus: null, scheduledStatusAt: null })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });

  if (!updated) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
