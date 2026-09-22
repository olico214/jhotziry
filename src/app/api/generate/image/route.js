import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creditTransactions, drafts, generationJobs, users } from "@/lib/db/schema";
import { resolveUserDraft } from "@/lib/db/drafts";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { getProvider } from "@/lib/ai/provider";
import { describeImagePrompt, enhanceImagePrompt, isEnhanceEnabled } from "@/lib/ai/deepseek";
import { ensureRunner } from "@/lib/jobs/runner";
import { extensionFor } from "@/lib/storage/files";
import {
  imageRecordFromBuffer,
  mimeFromExtension,
} from "@/lib/storage/images";

const CREDITS_PER_PREVIEW = Number(process.env.CREDITS_PER_PREVIEW || 5);
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const draftIdSchema = z.string().uuid().nullish();

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;
  const { user } = guard;

  const limited = limitByKey("generate:image", user.id, 10, 60 * 60 * 1000);
  if (limited) return limited;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const file = form.get("image");
  const draftId = draftIdSchema.safeParse(form.get("draftId") || undefined);

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Sube una imagen válida" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "El archivo debe ser una imagen" },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera los 8 MB" },
      { status: 413 },
    );
  }

  const extension = extensionFor(file);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: "Usa una imagen PNG, JPG o WEBP" },
      { status: 415 },
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

  const draft = await resolveUserDraft(
    user.id,
    draftId.success ? draftId.data : undefined,
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = mimeFromExtension(extension);

  const userPrompt = String(form.get("prompt") || "").trim().slice(0, 500);

  let summary = null;
  let extraPrompt = null;
  if (userPrompt) extraPrompt = userPrompt;

  if (isEnhanceEnabled()) {
    if (userPrompt) {
      try {
        const enhanced = await enhanceImagePrompt(userPrompt);
        if (enhanced) extraPrompt = enhanced;
      } catch (error) {
        console.error("[ai] DeepSeek no disponible:", error.message);
      }
    }

    try {
      const described = await describeImagePrompt(buffer, mime);
      summary = described?.summary ?? null;
    } catch (error) {
      console.error("[ai] DeepSeek no disponible:", error.message);
    }
  }

  await db
    .update(drafts)
    .set({
      mode: "image",
      style: "cartoon",
      prompt: userPrompt || null,
      enhancedPrompt: userPrompt ? extraPrompt : null,
      aiSummary: summary,
      sourceImage: imageRecordFromBuffer(buffer, mime),
      sourceImagePath: null,
      previewImage: null,
      previewPath: null,
      modelPath: null,
      status: "generating",
      updatedAt: new Date(),
    })
    .where(eq(drafts.id, draft.id));

  const [debited] = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${CREDITS_PER_PREVIEW}` })
    .where(
      and(eq(users.id, user.id), gte(users.credits, CREDITS_PER_PREVIEW)),
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
    reason: "Caricatura de foto",
  });

  const provider = getProvider();
  ensureRunner();

  const [job] = await db
    .insert(generationJobs)
    .values({
      draftId: draft.id,
      type: "image",
      status: "queued",
      progress: 0,
      provider: provider.name,
    })
    .returning();

  try {
    const { stage, providerTaskId } = await provider.start({
      mode: "image_style",
      imageBuffer: buffer,
      imageExtension: extension,
      prompt: extraPrompt,
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

    console.error("[generate:image] start error:", error.message);
    return NextResponse.json(
      { error: "No pudimos iniciar la generación. Inténtalo de nuevo." },
      { status: 502 },
    );
  }
}
