import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import {
  deleteOrderStatus,
  getOrderStatuses,
  updateOrderStatus,
} from "@/lib/orders/statuses";

const updateSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  clientCanEditModel: z.boolean().optional(),
  clientUploadsPhoto: z.boolean().optional(),
  clientPhotoNextStatus: z.string().trim().max(40).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("admin-statuses", guard.user.id, 60, 60_000);
  if (limited) return limited;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const status = await updateOrderStatus(id, parsed.data);
  if (!status) {
    return NextResponse.json({ error: "Estado no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status });
}

export async function DELETE(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("admin-statuses", guard.user.id, 60, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;

  const statuses = await getOrderStatuses({ includeInactive: true });
  const target = statuses.find((item) => item.id === id);
  if (!target) {
    return NextResponse.json({ error: "Estado no encontrado" }, { status: 404 });
  }
  if (target.isSystem) {
    return NextResponse.json(
      { error: "Los estados del sistema no se pueden eliminar" },
      { status: 400 },
    );
  }

  await deleteOrderStatus(id);
  return NextResponse.json({ ok: true });
}
