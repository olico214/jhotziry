import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orderMessages, orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { notify, notifyAdmins } from "@/lib/notifications";

const schema = z.object({
  body: z.string().trim().min(1, "Escribe un mensaje").max(1000),
});

async function loadOrder(id, user) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return {
      error: NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 }),
    };
  }

  if (order.userId !== user.id && !user.isAdmin) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
    };
  }

  return { order };
}

export async function GET(request, ctx) {
  const guard = await requireUser(request, { csrf: false });
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const loaded = await loadOrder(id, guard.user);
  if (loaded.error) return loaded.error;

  const rows = await db
    .select({
      id: orderMessages.id,
      body: orderMessages.body,
      isAdmin: orderMessages.isAdmin,
      authorId: orderMessages.authorId,
      createdAt: orderMessages.createdAt,
    })
    .from(orderMessages)
    .where(eq(orderMessages.orderId, id))
    .orderBy(asc(orderMessages.createdAt));

  return NextResponse.json({
    messages: rows.map((row) => ({
      ...row,
      mine: row.authorId === guard.user.id,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
  });
}

export async function POST(request, ctx) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;

  const limited = limitByKey(
    "order:messages",
    guard.user.id,
    60,
    60 * 60 * 1000,
  );
  if (limited) return limited;

  const { id } = await ctx.params;
  const loaded = await loadOrder(id, guard.user);
  if (loaded.error) return loaded.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Mensaje inválido" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(orderMessages)
    .values({
      orderId: id,
      authorId: guard.user.id,
      isAdmin: guard.user.isAdmin,
      body: parsed.data.body,
    })
    .returning({ id: orderMessages.id });

  const preview = parsed.data.body.slice(0, 120);

  const orderLabel = loaded.order.description || "Pieza impresa";
  const link = `/mis-pedidos/${id}#chat`;

  if (guard.user.isAdmin && loaded.order.userId !== guard.user.id) {
    await notify(loaded.order.userId, {
      type: "order_message",
      title: "Nuevo mensaje del equipo",
      body: `${orderLabel}: ${preview}`,
      link,
    }).catch(() => {});
  } else {
    await notifyAdmins(
      {
        type: "order_message",
        title: "Nuevo mensaje del cliente",
        body: `${orderLabel}: ${preview}`,
        link,
      },
      guard.user.id,
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: created.id });
}
