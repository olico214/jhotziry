import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, generationJobs, orders, users } from "@/lib/db/schema";
import { getProvider } from "@/lib/ai/provider";
import { saveBuffer } from "@/lib/storage/files";
import { sendImageReadyEmail } from "@/lib/auth/mail";
import { APP_NAME } from "@/lib/config";

const inFlight = (globalThis.__jhoInFlight ??= new Set());

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
      step = { status: "failed", error: error.message, progress: job.progress };
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
      const relative = `models/${draft.id}/preview.${step.previewExtension || "png"}`;
      await saveBuffer(relative, step.previewBuffer);
      draftPatch.previewPath = relative;
      draftPatch.status = "ready";
    }

    if (step.modelBuffer) {
      const relative = `models/${draft.id}/model.${step.modelExtension || "glb"}`;
      await saveBuffer(relative, step.modelBuffer);
      draftPatch.modelPath = relative;
      await db
        .update(orders)
        .set({ modelPath: relative, status: "ready", updatedAt: new Date() })
        .where(and(eq(orders.draftId, draft.id), eq(orders.status, "generating")));
    }

    if (step.status === "failed") {
      draftPatch.status = "failed";
      await db
        .update(orders)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(orders.draftId, draft.id), eq(orders.status, "generating")));
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
          `${base}/mis-disenos`,
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
