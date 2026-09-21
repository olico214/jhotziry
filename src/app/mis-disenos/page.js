import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";
import { DraftImageCard } from "@/components/drafts/DraftImageCard";

export const metadata = {
  title: "Mis diseños",
};

const ORDER_STATUS = {
  new: "Pedido recibido",
  generating: "Preparando el modelo",
  ready: "Modelo listo",
  failed: "Revisión manual",
  done: "Completado",
  cancelled: "Cancelado",
};

export default async function MisDisenosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?acceso=requerido");

  const [rows, userOrders] = await Promise.all([
    db
      .select()
      .from(drafts)
      .where(eq(drafts.userId, user.id))
      .orderBy(desc(drafts.createdAt)),
    db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt)),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Mis diseños
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Tienes {user.credits} créditos. Cada vista previa descuenta créditos.
          </p>
        </div>
        <Link href="/crear">
          <Button>Crear otro</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-blush-200 bg-white/60 px-6 py-16 text-center">
          <p className="text-4xl">🎀</p>
          <p className="mt-3 text-sm text-ink-soft">
            Aún no has creado diseños. Empieza con una idea o una foto.
          </p>
          <Link href="/crear" className="mt-5 inline-block">
            <Button size="lg">Comenzar a Crear</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((draft) => (
            <DraftImageCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}

      {userOrders.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-ink">Mis pedidos</h2>
          <div className="overflow-hidden rounded-4xl border border-blush-100 bg-white/70">
            {userOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-blush-100 px-5 py-4 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {order.name}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {new Date(order.createdAt).toLocaleDateString("es")}
                  </p>
                </div>
                <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold text-blush-700">
                  {ORDER_STATUS[order.status] || order.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
