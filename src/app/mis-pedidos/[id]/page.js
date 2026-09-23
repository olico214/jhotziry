import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, orderEvents, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderStatuses } from "@/lib/orders/statuses";
import { Button } from "@/components/ui/Button";
import { OrderChat } from "@/components/orders/OrderChat";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { Model3DViewer } from "@/components/orders/Model3DViewer";
import { OrderClientPhoto } from "@/components/orders/OrderClientPhoto";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Detalle del pedido",
};

const FALLBACK_LABEL = {
  new: "Pedido recibido",
  generating: "Preparando el modelo",
  ready: "Modelo listo",
  confirmed: "Confirmado por cliente",
  failed: "Revisión manual",
  done: "Completado",
  cancelled: "Cancelado",
};

const STATUS_DOT = {
  new: "bg-blush-400",
  generating: "bg-amber-400",
  ready: "bg-emerald-400",
  confirmed: "bg-sky-400",
  failed: "bg-red-400",
  done: "bg-emerald-500",
  cancelled: "bg-zinc-400",
};

export default async function OrderDetailPage({ params }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/?acceso=requerido");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) notFound();
  if (order.userId !== user.id && !user.isAdmin) notFound();

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, order.draftId))
    .limit(1);

  const events = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, order.id))
    .orderBy(asc(orderEvents.createdAt));

  const statuses = await getOrderStatuses({ includeInactive: true });
  const statusLabel = {
    ...FALLBACK_LABEL,
    ...Object.fromEntries(statuses.map((item) => [item.key, item.label])),
  };
  const statusDef = statuses.find((item) => item.key === order.status);
  const clientCanEditModel = Boolean(statusDef?.clientCanEditModel);
  const canEditModel = user.isAdmin || clientCanEditModel;
  const clientPhotoUrl =
    order.clientPhoto || order.clientPhotoKey
      ? `/api/orders/${order.id}/photo?v=${new Date(order.updatedAt).getTime()}`
      : null;

  const previewUrl =
    draft && (draft.previewImage || draft.previewImageKey || draft.previewPath)
      ? `/api/preview/${draft.id}?v=${new Date(draft.updatedAt).getTime()}`
      : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <Link
        href={user.isAdmin ? "/admin" : "/mis-pedidos"}
        className="text-sm font-semibold text-blush-600 hover:underline"
      >
        {user.isAdmin ? "← Volver al panel" : "← Volver a mis pedidos"}
      </Link>

      {user.isAdmin ? (
        <div className="mt-4">
          <AdminOrderActions
            orderId={order.id}
            draftId={order.draftId}
            status={order.status}
            hasModel={Boolean(order.modelPath)}
            hasParts={Boolean(order.modelPartsPath)}
            statuses={statuses.filter((item) => item.active)}
          />
        </div>
      ) : null}

      {order.modelPath || order.modelPartsPath || order.editedModelPath ? (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-ink">Modelo 3D</h2>
          <Model3DViewer
            draftId={order.draftId}
            orderId={order.id}
            version={new Date(order.updatedAt).getTime()}
            hasModel={Boolean(order.modelPath)}
            hasParts={Boolean(order.modelPartsPath)}
            hasEdited={Boolean(order.editedModelPath)}
            savedColorUrl={
              user.isAdmin && order.colorModelPath
                ? `/api/orders/${order.id}/model?kind=color&v=${new Date(order.updatedAt).getTime()}`
                : null
            }
            canDownloadImage
            canDownloadGlb={user.isAdmin}
            canSaveColorModel={user.isAdmin}
            canUploadEdited={user.isAdmin && clientCanEditModel}
            canEdit={canEditModel}
            initialPartColors={order.partColors || {}}
          />
          <p className="mt-2 text-xs text-ink-soft">
            {canEditModel
              ? "Vista previa en 3D. La descarga del modelo la gestiona el equipo."
              : "Vista en 3D. En este estado ya no se pueden cambiar los colores; puedes girar y hacer zoom, pero la descarga la gestiona el equipo."}
          </p>
        </section>
      ) : null}

      {order.clientPhoto || order.clientPhotoKey || statusDef?.clientUploadsPhoto ? (
        <OrderClientPhoto
          orderId={order.id}
          canUpload={Boolean(statusDef?.clientUploadsPhoto)}
          photoUrl={clientPhotoUrl}
        />
      ) : null}

      <div className="mt-4 grid gap-6 sm:grid-cols-[240px_1fr]">
        <div className="h-60 w-full overflow-hidden rounded-4xl border border-blush-100 bg-blush-50">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={order.description || "Producto"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {order.description || "Pieza impresa"}
            </h1>
            <span className="rounded-full bg-blush-100 px-3 py-1 text-xs font-semibold text-blush-700">
              {statusLabel[order.status] || order.status}
            </span>
          </div>

          <dl className="grid gap-2 text-sm">
            <Row label="Cantidad" value={order.quantity ?? 1} />
            <Row label="Recibe" value={order.name} />
            <Row label="Domicilio" value={order.address || "—"} />
            <Row label="Correo" value={order.email} />
            {order.notes ? <Row label="Notas" value={order.notes} /> : null}
            <Row
              label="Fecha"
              value={new Date(order.createdAt).toLocaleString("es")}
            />
          </dl>

          {draft?.prompt ? (
            <p className="rounded-3xl border border-blush-100 glass px-4 py-3 text-sm text-ink-soft">
              <span className="font-semibold text-blush-600">Prompt:</span>{" "}
              {draft.prompt}
            </p>
          ) : null}

          {draft?.aiSummary ? (
            <p className="rounded-3xl border border-blush-100 bg-white/70 px-4 py-3 text-sm text-ink-soft">
              <span className="font-semibold text-blush-600">
                Interpretación de la IA:
              </span>{" "}
              {draft.aiSummary}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/crear">
              <Button variant="secondary">Crear otro</Button>
            </Link>
            <Link href="/mis-pedidos">
              <Button variant="ghost">Ver todos mis pedidos</Button>
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-ink">
          Seguimiento del pedido
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin actualizaciones todavía.</p>
        ) : (
          <ol className="space-y-4">
            {events
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.id} className="flex gap-4">
                  <span
                    className={cn(
                      "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                      STATUS_DOT[event.status] || "bg-blush-300",
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {statusLabel[event.status] || event.status}
                    </p>
                    {event.note ? (
                      <p className="text-xs text-ink-soft">{event.note}</p>
                    ) : null}
                    <p className="text-xs text-ink-soft">
                      {new Date(event.createdAt).toLocaleString("es")}
                    </p>
                  </div>
                </li>
              ))}
          </ol>
        )}
      </section>

      <section id="chat" className="mt-10 scroll-mt-24">
        <h2 className="mb-4 text-lg font-bold text-ink">
          Mensajes con el equipo
        </h2>
        <OrderChat orderId={order.id} />
      </section>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3 border-b border-blush-100 pb-2">
      <dt className="w-24 shrink-0 text-ink-soft">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
