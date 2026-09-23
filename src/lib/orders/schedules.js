import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderEvents, orders } from "@/lib/db/schema";
import { getOrderStatusByKey } from "@/lib/orders/statuses";

export async function processScheduledStatuses() {
  const due = await db
    .select()
    .from(orders)
    .where(
      and(
        isNotNull(orders.scheduledStatus),
        isNotNull(orders.scheduledStatusAt),
        lte(orders.scheduledStatusAt, new Date()),
      ),
    )
    .limit(50);

  for (const order of due) {
    const statusDef = await getOrderStatusByKey(order.scheduledStatus);

    if (!statusDef) {
      await db
        .update(orders)
        .set({ scheduledStatus: null, scheduledStatusAt: null })
        .where(eq(orders.id, order.id));
      continue;
    }

    await db
      .update(orders)
      .set({
        status: statusDef.key,
        scheduledStatus: null,
        scheduledStatusAt: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: statusDef.key,
      note: `Estado programado aplicado: ${statusDef.label}`,
    });
  }

  return due.length;
}
