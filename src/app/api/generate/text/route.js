import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  creditTransactions,
  drafts,
  generationJobs,
  users,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { hasActiveJob } from "@/lib/jobs/active";
import { resolveUserDraft } from "@/lib/db/drafts";
import { getProvider } from "@/lib/ai/provider";
import { enhanceTextPrompt, isEnhanceEnabled } from "@/lib/ai/deepseek";
import { ensureRunner } from "@/lib/jobs/runner";

const CREDITS_PER_PREVIEW = Number(process.env.CREDITS_PER_PREVIEW || 5);

const STYLE_TAGS = {
  realistic: "photorealistic, realistic look, natural materials",
  anime: "anime style, manga illustration",
  cartoon: "cartoon caricature style, 3d animated movie look",
};

function withStyle(prompt, style) {
  const tag = STYLE_TAGS[style];
  return tag ? `${prompt}. Style: ${tag}` : prompt;
}

const bodySchema = z.object({
  draftId: z.string().uuid().nullish(),
  prompt: z
    .string()
    .trim()
    .min(3, "Describe tu idea con al menos 3 caracteres")
    .max(500),
  style: z.enum(["realistic", "anime", "cartoon"]).optional(),
});

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;
  const { user } = guard;

  const limited = limitByKey("generate:text", user.id, 10, 60 * 60 * 1000);
  if (limited) return limited;

  if (await hasActiveJob(user.id)) {
    return NextResponse.json(
      { error: "Ya tienes una generación en curso. Espera a que termine." },
      { status: 409 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Solicitud inválida" },
      { status: 400 },
    );
  }

  if (user.credits < CREDITS_PER_PREVIEW) {
    return NextResponse.json(
      {
        error:
          "No tienes créditos suficientes. Pídele al administrador que te recargue.",
      },
      { status: 402 },
    );
  }

  const style = parsed.data.style || "realistic";
  ensureRunner();

  let enhanced = null;
  if (isEnhanceEnabled()) {
    try {
      enhanced = await enhanceTextPrompt(parsed.data.prompt, style);
    } catch (error) {
      console.error("[ai] DeepSeek no disponible:", error.message);
    }
  }

  const draft = await resolveUserDraft(user.id, parsed.data.draftId);

  await db
    .update(drafts)
    .set({
      mode: "text",
      style,
      prompt: parsed.data.prompt,
      enhancedPrompt: enhanced?.prompt ?? null,
      aiSummary: enhanced?.summary ?? null,
      previewPath: null,
      previewImage: null,
      modelPath: null,
      status: "generating",
      updatedAt: new Date(),
    })
    .where(eq(drafts.id, draft.id));

  const [debited] = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${CREDITS_PER_PREVIEW}` })
    .where(
      and(
        eq(users.id, user.id),
        gte(users.credits, CREDITS_PER_PREVIEW),
      ),
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
    amount: -CREDITS_PER_PREVIEW,
    balanceAfter: debited.credits,
    reason: "Generación de vista previa",
  });

  const provider = getProvider();
  const [job] = await db
    .insert(generationJobs)
    .values({
      draftId: draft.id,
      type: "text",
      status: "queued",
      progress: 0,
      provider: provider.name,
    })
    .returning();

  try {
    const { stage, providerTaskId } = await provider.start({
      mode: "text",
      prompt: withStyle(enhanced?.prompt || parsed.data.prompt, style),
    });

    await db
      .update(generationJobs)
      .set({
        stage,
        providerJobId: providerTaskId,
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));

    return NextResponse.json({
      draftId: draft.id,
      jobId: job.id,
      credits: debited.credits,
    });
  } catch (error) {
    const [refunded] = await db
      .update(users)
      .set({ credits: sql`${users.credits} + ${CREDITS_PER_PREVIEW}` })
      .where(eq(users.id, user.id))
      .returning({ credits: users.credits });

    await db.insert(creditTransactions).values({
      userId: user.id,
      amount: CREDITS_PER_PREVIEW,
      balanceAfter: refunded?.credits ?? user.credits,
      reason: "Reembolso por error de generación",
    });

    await db
      .update(generationJobs)
      .set({ status: "failed", error: error.message, updatedAt: new Date() })
      .where(eq(generationJobs.id, job.id));

    await db
      .update(drafts)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(drafts.id, draft.id));

    console.error("[generate:text] start error:", error.message);
    return NextResponse.json(
      { error: "No pudimos iniciar la generación. Inténtalo de nuevo." },
      { status: 502 },
    );
  }
}
