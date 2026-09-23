import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderStatuses } from "@/lib/db/schema";

export const DEFAULT_ORDER_STATUSES = [
  {
    key: "new",
    label: "Nuevo",
    sortOrder: 10,
    clientCanEditModel: false,
    isSystem: true,
  },
  {
    key: "generating",
    label: "Generando modelo",
    sortOrder: 20,
    clientCanEditModel: false,
    isSystem: true,
  },
  {
    key: "ready",
    label: "Modelo listo",
    sortOrder: 30,
    clientCanEditModel: true,
    isSystem: true,
  },
  {
    key: "confirmed",
    label: "Confirmado por cliente",
    sortOrder: 40,
    clientCanEditModel: false,
    isSystem: true,
  },
  {
    key: "failed",
    label: "Error",
    sortOrder: 50,
    clientCanEditModel: false,
    isSystem: true,
  },
  {
    key: "received",
    label: "Recibido",
    sortOrder: 55,
    clientCanEditModel: false,
    clientUploadsPhoto: true,
    clientPhotoNextStatus: "done",
    isSystem: false,
  },
  {
    key: "done",
    label: "Completado",
    sortOrder: 60,
    clientCanEditModel: false,
    isSystem: false,
  },
  {
    key: "cancelled",
    label: "Cancelado",
    sortOrder: 70,
    clientCanEditModel: false,
    isSystem: false,
  },
];

export const SYSTEM_STATUS_KEYS = DEFAULT_ORDER_STATUSES.filter(
  (status) => status.isSystem,
).map((status) => status.key);

export function slugifyStatusKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

let ensured = false;

export async function ensureOrderStatuses() {
  if (ensured) return;
  await db
    .insert(orderStatuses)
    .values(DEFAULT_ORDER_STATUSES)
    .onConflictDoNothing({ target: orderStatuses.key });
  ensured = true;
}

export async function getOrderStatuses({ includeInactive = false } = {}) {
  await ensureOrderStatuses();
  const base = db.select().from(orderStatuses);
  const rows = includeInactive
    ? await base.orderBy(asc(orderStatuses.sortOrder), asc(orderStatuses.label))
    : await base
        .where(eq(orderStatuses.active, true))
        .orderBy(asc(orderStatuses.sortOrder), asc(orderStatuses.label));
  return rows;
}

export async function getOrderStatusByKey(key) {
  await ensureOrderStatuses();
  const [row] = await db
    .select()
    .from(orderStatuses)
    .where(eq(orderStatuses.key, key))
    .limit(1);
  return row ?? null;
}

export async function createOrderStatus({
  key,
  label,
  description,
  sortOrder,
  clientCanEditModel,
  clientUploadsPhoto,
  clientPhotoNextStatus,
  isSystem,
}) {
  const [row] = await db
    .insert(orderStatuses)
    .values({
      key,
      label,
      description: description || null,
      sortOrder: sortOrder ?? 0,
      clientCanEditModel: Boolean(clientCanEditModel),
      clientUploadsPhoto: Boolean(clientUploadsPhoto),
      clientPhotoNextStatus: clientPhotoNextStatus || null,
      isSystem: Boolean(isSystem),
    })
    .returning();
  return row;
}

export async function updateOrderStatus(id, patch) {
  const [row] = await db
    .update(orderStatuses)
    .set(patch)
    .where(eq(orderStatuses.id, id))
    .returning();
  return row ?? null;
}

export async function deleteOrderStatus(id) {
  const [row] = await db
    .delete(orderStatuses)
    .where(eq(orderStatuses.id, id))
    .returning();
  return row ?? null;
}
