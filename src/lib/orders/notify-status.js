import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, users } from "@/lib/db/schema";
import { getOrderStatusByKey } from "@/lib/orders/statuses";
import { sendStatusUpdateEmail } from "@/lib/auth/mail";
import { notify } from "@/lib/notifications";
import { APP_NAME } from "@/lib/config";

export async function notifyOrderStatusChange(
  orderId,
  statusKey,
  previousStatus = null,
) {
  if (previousStatus && previousStatus === statusKey) return;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return;

  const statusDef = await getOrderStatusByKey(statusKey);
  const label = statusDef?.label || statusKey;

  const [owner] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  const base = process.env.APP_URL || "http://localhost:3000";

  if (owner?.email) {
    await sendStatusUpdateEmail(
      owner.email,
      {
        label,
        description: order.description,
        url: `${base}/mis-pedidos/${order.id}`,
      },
      APP_NAME,
    ).catch(() => {});
  }

  await notify(order.userId, {
    type: "order_status",
    title: `Tu pedido está en: ${label}`,
    body: order.description ? `Pedido: ${order.description}` : null,
    link: `/mis-pedidos/${order.id}`,
  }).catch(() => {});
}
