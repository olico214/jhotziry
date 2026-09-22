import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import {
  createOrderStatus,
  getOrderStatuses,
  slugifyStatusKey,
} from "@/lib/orders/statuses";

const createSchema = z.object({
  key: z.string().trim().max(40).optional(),
  label: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  clientCanEditModel: z.boolean().optional(),
});

export async function GET(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const statuses = await getOrderStatuses({ includeInactive: true });
  return NextResponse.json({ statuses });
}

export async function POST(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("admin-statuses", guard.user.id, 30, 60_000);
  if (limited) return limited;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const key = slugifyStatusKey(parsed.data.key || parsed.data.label);
  if (!key) {
    return NextResponse.json(
      { error: "El nombre no genera una clave válida" },
      { status: 400 },
    );
  }

  try {
    const status = await createOrderStatus({
      key,
      label: parsed.data.label,
      description: parsed.data.description,
      sortOrder: parsed.data.sortOrder,
      clientCanEditModel: parsed.data.clientCanEditModel,
    });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un estado con esa clave" },
        { status: 409 },
      );
    }
    console.error("[admin:statuses] error:", error.message);
    return NextResponse.json(
      { error: "No se pudo crear el estado" },
      { status: 500 },
    );
  }
}
