import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderStatuses } from "@/lib/orders/statuses";
import { Button } from "@/components/ui/Button";
import { OrdersBoard } from "@/components/orders/OrdersBoard";

export const metadata = {
  title: "Mis pedidos",
};

export default async function MisPedidosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?acceso=requerido");

  const rows = await db
    .select({ order: orders, draft: drafts })
    .from(orders)
    .innerJoin(drafts, eq(drafts.id, orders.draftId))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  const serialized = rows.map(({ order, draft }) => ({
    id: order.id,
    status: order.status,
    name: order.name,
    email: order.email,
    address: order.address,
    description: order.description,
    quantity: order.quantity,
    createdAt: new Date(order.createdAt).toISOString(),
    draftId: draft.id,
    previewUrl:
      draft.previewImage || draft.previewPath
        ? `/api/preview/${draft.id}?v=${new Date(draft.updatedAt).getTime()}`
        : null,
  }));

  const statuses = await getOrderStatuses();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Mis pedidos
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Revisa el estado de tus piezas y fíltralas a tu gusto.
          </p>
        </div>
        <Link href="/crear">
          <Button>Crear otro</Button>
        </Link>
      </div>

      <OrdersBoard orders={serialized} statuses={statuses} />
    </main>
  );
}
