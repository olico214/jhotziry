import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderEvents, orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import { limitByKey } from "@/lib/security/rate-limit";
import { extensionFor } from "@/lib/storage/files";
import { imageRecordFromBuffer, mimeFromExtension } from "@/lib/storage/images";
import {
  getObject,
  isObjectStoreConfigured,
  orderClientPhotoKey,
  putObject,
} from "@/lib/storage/object-store";
import { getOrderStatusByKey } from "@/lib/orders/statuses";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export async function GET(request, ctx) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return new Response("Pedido no encontrado", { status: 404 });
  }

  if (!user.isAdmin && order.userId !== user.id) {
    return new Response("No autorizado", { status: 403 });
  }

  if (order.clientPhotoKey && isObjectStoreConfigured()) {
    try {
      const { buffer, contentType } = await getObject(order.clientPhotoKey);
      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(buffer.length),
          "Cache-Control": "private, no-store",
        },
      });
    } catch (error) {
      console.error("[storage] client photo fetch:", error.message);
    }
  }

  if (order.clientPhoto?.data) {
    const buffer = Buffer.from(order.clientPhoto.data, "base64");
    return new Response(buffer, {
      headers: {
        "Content-Type": order.clientPhoto.mime || "image/png",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new Response("Foto no encontrada", { status: 404 });
}

export async function POST(request, ctx) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("order:photo", guard.user.id, 20, 60_000);
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

  if (!guard.user.isAdmin && order.userId !== guard.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const statusDef = await getOrderStatusByKey(order.status);
  if (!statusDef?.clientUploadsPhoto) {
    return NextResponse.json(
      { error: "En este estado no se puede subir una foto." },
      { status: 403 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Sube una imagen válida" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "El archivo debe ser una imagen" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera los 8 MB" },
      { status: 413 },
    );
  }

  const extension = extensionFor(file);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: "Usa una imagen PNG, JPG o WEBP" },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = mimeFromExtension(extension);

  let clientPhotoKey = null;
  let clientPhoto = imageRecordFromBuffer(buffer, mime);

  if (isObjectStoreConfigured()) {
    try {
      clientPhotoKey = orderClientPhotoKey(order.id, extension);
      await putObject(clientPhotoKey, buffer, mime);
      clientPhoto = null;
    } catch (error) {
      console.error("[storage] client photo upload:", error.message);
      clientPhotoKey = null;
    }
  }

  let nextStatus = order.status;
  const nextDef = statusDef.clientPhotoNextStatus
    ? await getOrderStatusByKey(statusDef.clientPhotoNextStatus)
    : null;
  if (nextDef) nextStatus = nextDef.key;

  await db
    .update(orders)
    .set({
      clientPhotoKey,
      clientPhoto,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    orderId: order.id,
    status: nextStatus,
    note: nextDef
      ? `El cliente subió la foto de recibido · Estado: ${nextDef.label}`
      : "El cliente subió la foto de recibido",
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
