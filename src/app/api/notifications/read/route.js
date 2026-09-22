import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";

const schema = z.object({ id: z.string().uuid().optional() });

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const where = parsed.data.id
    ? and(
        eq(notifications.userId, guard.user.id),
        eq(notifications.id, parsed.data.id),
      )
    : and(
        eq(notifications.userId, guard.user.id),
        isNull(notifications.readAt),
      );

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(where);

  return NextResponse.json({ ok: true });
}
