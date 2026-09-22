import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { drafts, orderEvents, orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { adminEmails } from "@/lib/auth/roles";
import {
  sendNewOrderEmail,
  sendOrderConfirmationEmail,
} from "@/lib/auth/mail";
import { APP_NAME } from "@/lib/config";
import { notifyAdmins } from "@/lib/notifications";

const schema = z.object({
  draftId: z.string().uuid(),
  name: z.string().trim().min(2, "Escribe el nombre de quien recibe").max(160),
  email: z.string().trim().email("Correo no válido"),
  address: z.string().trim().min(5, "Escribe el domicilio").max(300),
  description: z.string().trim().max(1000).optional(),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;
  const { user } = guard;

  const limited = limitByKey("orders:create", user.id, 30, 60 * 60 * 1000);
  if (limited) return limited;

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

  if (!draft.previewImage && !draft.previewPath) {
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
      address: parsed.data.address,
      description: parsed.data.description ?? null,
      quantity: parsed.data.quantity ?? 1,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: orders.id });

  await db.insert(orderEvents).values({
    orderId: order.id,
    status: "new",
    note: "Pedido recibido",
  });

  const base = process.env.APP_URL || new URL(request.url).origin;
  const summary = {
    name: parsed.data.name,
    email: parsed.data.email,
    address: parsed.data.address,
    description: parsed.data.description ?? null,
    quantity: parsed.data.quantity ?? 1,
    adminUrl: `${base}/admin`,
    ordersUrl: `${base}/mis-pedidos`,
  };

  await Promise.all([
    sendNewOrderEmail(adminEmails(), summary, APP_NAME).catch(() => {}),
    sendOrderConfirmationEmail(parsed.data.email, summary, APP_NAME).catch(
      () => {},
    ),
  ]);

  await notifyAdmins({
    type: "new_order",
    title: "Nuevo pedido",
    body: `${parsed.data.name}: ${parsed.data.description || "Pieza impresa"}`,
    link: "/admin",
  }).catch(() => {});

  return NextResponse.json({ ok: true, orderId: order.id });
}

export async function GET(request) {
  const guard = await requireUser(request, { csrf: false });
  if (guard.error) return guard.error;
  const { user } = guard;

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  return NextResponse.json({ orders: rows });
}
