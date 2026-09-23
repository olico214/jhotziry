import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderEvents, orders } from "@/lib/db/schema";
import { getOrderStatuses } from "@/lib/orders/statuses";
import { notifyOrderStatusChange } from "@/lib/orders/notify-status";

const BATCH_LIMIT = 200;
const NOTIFY_CONCURRENCY = 5;

async function runWithConcurrency(items, limit, worker) {
  let index = 0;
  const size = Math.min(limit, items.length);
  const runners = Array.from({ length: size }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current).catch(() => {});
    }
  });
  await Promise.all(runners);
}

export async function processScheduledStatuses() {
  const now = new Date();

  const due = await db
    .select()
    .from(orders)
    .where(
      and(
        isNotNull(orders.scheduledStatus),
        isNotNull(orders.scheduledStatusAt),
        lte(orders.scheduledStatusAt, now),
      ),
    )
    .limit(BATCH_LIMIT);

  if (due.length === 0) return 0;

  const statuses = await getOrderStatuses({ includeInactive: true });
  const statusMap = new Map(statuses.map((item) => [item.key, item]));

  const pending = [];

  for (const order of due) {
    const statusDef = statusMap.get(order.scheduledStatus);

    if (!statusDef) {
      await db
        .update(orders)
        .set({ scheduledStatus: null, scheduledStatusAt: null })
        .where(eq(orders.id, order.id));
      continue;
    }

    const [claimed] = await db
      .update(orders)
      .set({
        status: statusDef.key,
        scheduledStatus: null,
        scheduledStatusAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(orders.id, order.id),
          isNotNull(orders.scheduledStatus),
          lte(orders.scheduledStatusAt, now),
        ),
      )
      .returning({ id: orders.id });

    if (!claimed) continue;

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: statusDef.key,
      note: `Estado programado aplicado: ${statusDef.label}`,
    });

    pending.push({
      orderId: order.id,
      statusKey: statusDef.key,
      previous: order.status,
    });
  }

  await runWithConcurrency(pending, NOTIFY_CONCURRENCY, (item) =>
    notifyOrderStatusChange(item.orderId, item.statusKey, item.previous),
  );

  return due.length;
}
