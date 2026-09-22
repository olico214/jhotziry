import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creditTransactions, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((value) => value !== 0, "Cantidad inválida"),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(users)
    .set({ credits: sql`greatest(0, ${users.credits} + ${parsed.data.amount})` })
    .where(eq(users.id, parsed.data.userId))
    .returning({ credits: users.credits, email: users.email });

  if (!updated) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  await db.insert(creditTransactions).values({
    userId: parsed.data.userId,
    amount: parsed.data.amount,
    balanceAfter: updated.credits,
    reason: parsed.data.reason || "Ajuste del administrador",
  });

  return NextResponse.json({ ok: true, credits: updated.credits });
}
