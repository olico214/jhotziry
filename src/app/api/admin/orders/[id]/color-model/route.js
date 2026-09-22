import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { saveBuffer } from "@/lib/storage/files";

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("color-model", guard.user.id, 20, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Sube un archivo GLB" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera los 50 MB" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length < 12 || buffer.toString("ascii", 0, 4) !== "glTF") {
    return NextResponse.json(
      { error: "El archivo no es un GLB válido" },
      { status: 415 },
    );
  }

  const relative = `models/${order.draftId}/order-${order.id}-color.glb`;
  await saveBuffer(relative, buffer);

  await db
    .update(orders)
    .set({ colorModelPath: relative, updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  return NextResponse.json({ ok: true, path: relative });
}
