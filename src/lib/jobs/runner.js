import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  creditTransactions,
  drafts,
  generationJobs,
  orderEvents,
  orders,
  users,
} from "@/lib/db/schema";
import { getProvider } from "@/lib/ai/provider";
import { saveBuffer } from "@/lib/storage/files";
import {
  imageRecordFromBuffer,
  mimeFromExtension,
} from "@/lib/storage/images";
import { sendImageReadyEmail } from "@/lib/auth/mail";
import { APP_NAME } from "@/lib/config";

const inFlight = (globalThis.__jhoInFlight ??= new Set());
const MAX_ATTEMPTS = 5;
const CREDITS_PER_PREVIEW = Number(process.env.CREDITS_PER_PREVIEW || 5);

async function refundPreview(draft) {
  if (!draft?.userId || CREDITS_PER_PREVIEW <= 0) return;

  const [refunded] = await db
    .update(users)
    .set({ credits: sql`${users.credits} + ${CREDITS_PER_PREVIEW}` })
    .where(eq(users.id, draft.userId))
    .returning({ credits: users.credits });

  await db.insert(creditTransactions).values({
    userId: draft.userId,
    amount: CREDITS_PER_PREVIEW,
    balanceAfter: refunded?.credits ?? 0,
    reason: "Reembolso por error de generación",
  });
}

export async function advanceJob(jobId) {
  if (inFlight.has(jobId)) return null;
  inFlight.add(jobId);

  try {
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, jobId))
      .limit(1);

    if (!job) return { job: null, draft: null };

    let [draft] = await db
      .select()
      .from(drafts)
      .where(eq(drafts.id, job.draftId))
      .limit(1);

    if (job.status !== "processing") return { job, draft };

    if (!job.providerJobId) {
      if (job.attempts + 1 >= MAX_ATTEMPTS) {
        const [failed] = await db
          .update(generationJobs)
          .set({
            status: "failed",
            attempts: job.attempts + 1,
            error: "El proveedor no devolvió un identificador de tarea",
            updatedAt: new Date(),
          })
          .where(eq(generationJobs.id, job.id))
          .returning();
        await refundPreview(draft);
        return { job: failed, draft };
      }
      return { job, draft };
    }

    const provider = getProvider();
    const elapsedMs = Date.now() - new Date(job.createdAt).getTime();

    let step;
    try {
      step = await provider.step({
        stage: job.stage,
        providerTaskId: job.providerJobId,
        prompt: draft?.enhancedPrompt || draft?.prompt,
        elapsedMs,
      });
    } catch (error) {
      const attempts = job.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        const [failed] = await db
          .update(generationJobs)
          .set({
            status: "failed",
            attempts,
            error: error.message,
            updatedAt: new Date(),
          })
          .where(eq(generationJobs.id, job.id))
          .returning();
        await db
          .update(drafts)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(drafts.id, draft.id));
        await refundPreview(draft);
        return { job: failed, draft };
      }

      const [retried] = await db
        .update(generationJobs)
        .set({ attempts, updatedAt: new Date() })
        .where(eq(generationJobs.id, job.id))
        .returning();
      return { job: retried, draft };
    }

    const patch = {
      progress: step.progress ?? job.progress,
      updatedAt: new Date(),
    };
    if (step.stage) patch.stage = step.stage;
    if (step.providerTaskId) patch.providerJobId = step.providerTaskId;
    if (step.status === "succeeded") patch.status = "succeeded";
    if (step.status === "failed") {
      patch.status = "failed";
      patch.error = step.error;
    }

    const [updated] = await db
      .update(generationJobs)
      .set(patch)
      .where(eq(generationJobs.id, job.id))
      .returning();

    const draftPatch = { updatedAt: new Date() };

    if (step.previewBuffer) {
      draftPatch.previewImage = imageRecordFromBuffer(
        step.previewBuffer,
        mimeFromExtension(step.previewExtension || "png"),
      );
      draftPatch.previewPath = null;
      draftPatch.status = "ready";
    }

    if (step.modelBuffer) {
      const relative = `models/${draft.id}/model.${step.modelExtension || "glb"}`;
      await saveBuffer(relative, step.modelBuffer);
      draftPatch.modelPath = relative;
      const updatedOrders = await db
        .update(orders)
        .set({ modelPath: relative, status: "ready", updatedAt: new Date() })
        .where(and(eq(orders.draftId, draft.id), eq(orders.status, "generating")))
        .returning({ id: orders.id });

      if (updatedOrders.length > 0) {
        await db.insert(orderEvents).values(
          updatedOrders.map((row) => ({
            orderId: row.id,
            status: "ready",
            note: "Modelo 3D listo",
          })),
        );
      }
    }

    if (step.status === "failed") {
      draftPatch.status = "failed";
      const failedOrders = await db
        .update(orders)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(orders.draftId, draft.id), eq(orders.status, "generating")))
        .returning({ id: orders.id });

      if (failedOrders.length > 0) {
        await db.insert(orderEvents).values(
          failedOrders.map((row) => ({
            orderId: row.id,
            status: "failed",
            note: step.error || "No se pudo generar el modelo",
          })),
        );
      }

      await refundPreview(draft);
    }

    await db.update(drafts).set(draftPatch).where(eq(drafts.id, draft.id));

    if (step.status === "succeeded" && step.previewBuffer && draft.userId) {
      const [owner] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, draft.userId))
        .limit(1);

      if (owner?.email) {
        const base = process.env.APP_URL || "http://localhost:3000";
        await sendImageReadyEmail(
          owner.email,
          `${base}/mis-pedidos`,
          APP_NAME,
        ).catch(() => {});
      }
    }

    [draft] = await db
      .select()
      .from(drafts)
      .where(eq(drafts.id, job.draftId))
      .limit(1);

    return { job: updated, draft };
  } finally {
    inFlight.delete(jobId);
  }
}

export function ensureRunner() {
  if (globalThis.__jhoRunner) return;

  globalThis.__jhoRunner = setInterval(async () => {
    try {
      const rows = await db
        .select({ id: generationJobs.id })
        .from(generationJobs)
        .where(eq(generationJobs.status, "processing"))
        .limit(25);

      for (const row of rows) {
        await advanceJob(row.id).catch(() => {});
      }
    } catch (error) {
      console.error("[runner]", error.message);
    }
  }, 5000);

  if (typeof globalThis.__jhoRunner.unref === "function") {
    globalThis.__jhoRunner.unref();
  }
}
