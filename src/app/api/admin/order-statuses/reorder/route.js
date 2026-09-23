import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orderStatuses } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(300),
});

export async function POST(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("admin-statuses", guard.user.id, 120, 60_000);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const ids = parsed.data.ids;

  await Promise.all(
    ids.map((id, index) =>
      db
        .update(orderStatuses)
        .set({ sortOrder: (index + 1) * 10 })
        .where(eq(orderStatuses.id, id)),
    ),
  );

  return NextResponse.json({ ok: true });
}
