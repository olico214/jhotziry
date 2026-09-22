import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creditTransactions, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { expandIdea, isEnhanceEnabled } from "@/lib/ai/deepseek";

const CREDITS_PER_IDEA = Number(process.env.CREDITS_PER_IDEA || 1);

const bodySchema = z.object({
  idea: z
    .string()
    .trim()
    .min(3, "Escribe al menos una palabra")
    .max(500),
  style: z.enum(["realistic", "anime", "cartoon"]).optional(),
});

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;
  const { user } = guard;

  const limited = limitByKey("assistant:expand", user.id, 20, 60 * 60 * 1000);
  if (limited) return limited;

  if (!isEnhanceEnabled()) {
    return NextResponse.json(
      { error: "El asistente no está disponible en este momento." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Solicitud inválida" },
      { status: 400 },
    );
  }

  if (user.credits < CREDITS_PER_IDEA) {
    return NextResponse.json(
      {
        error:
          "No tienes créditos suficientes. Pídele al administrador que te recargue.",
      },
      { status: 402 },
    );
  }

  const [debited] = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${CREDITS_PER_IDEA}` })
    .where(
      and(eq(users.id, user.id), gte(users.credits, CREDITS_PER_IDEA)),
    )
    .returning({ credits: users.credits });

  if (!debited) {
    return NextResponse.json(
      { error: "No tienes créditos suficientes." },
      { status: 402 },
    );
  }

  await db.insert(creditTransactions).values({
    userId: user.id,
    amount: -CREDITS_PER_IDEA,
    balanceAfter: debited.credits,
    reason: "Botón mágico: idea ampliada",
  });

  try {
    const text = await expandIdea(
      parsed.data.idea,
      parsed.data.style || "cartoon",
    );

    if (!text) {
      throw new Error("El asistente no devolvió una respuesta");
    }

    return NextResponse.json({ text, credits: debited.credits });
  } catch (error) {
    const [refunded] = await db
      .update(users)
      .set({ credits: sql`${users.credits} + ${CREDITS_PER_IDEA}` })
      .where(eq(users.id, user.id))
      .returning({ credits: users.credits });

    await db.insert(creditTransactions).values({
      userId: user.id,
      amount: CREDITS_PER_IDEA,
      balanceAfter: refunded?.credits ?? user.credits,
      reason: "Reembolso del botón mágico",
    });

    console.error("[assistant:expand] error:", error.message);
    return NextResponse.json(
      { error: "No pudimos ampliar tu idea. Inténtalo de nuevo." },
      { status: 502 },
    );
  }
}
