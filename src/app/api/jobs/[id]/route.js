import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, generationJobs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessDraft } from "@/lib/db/drafts";
import { advanceJob } from "@/lib/jobs/runner";

function serialize(job, draft, isAdmin) {
  const version = draft ? new Date(draft.updatedAt).getTime() : Date.now();
  return {
    jobId: job.id,
    draftId: job.draftId,
    status: job.status,
    progress: job.progress,
    previewUrl:
      draft?.previewImage || draft?.previewImageKey || draft?.previewPath
        ? `/api/preview/${draft.id}?v=${version}`
        : null,
    modelUrl:
      isAdmin && job.status === "succeeded" && draft?.modelPath
        ? `/api/files/${draft.id}?v=${version}`
        : null,
    modelPartsUrl:
      isAdmin && job.status === "succeeded" && draft?.modelPartsPath
        ? `/api/files/${draft.id}?kind=parts&v=${version}`
        : null,
    summary: draft?.aiSummary ?? null,
    error: job.error,
  };
}

export async function GET(_request, ctx) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [job] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.id, id))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, job.draftId))
    .limit(1);

  if (!canAccessDraft(draft, user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (job.status === "processing") {
    const result = await advanceJob(id);
    if (result) {
      return NextResponse.json(serialize(result.job, result.draft, user.isAdmin));
    }
    const [fresh] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);
    return NextResponse.json(serialize(fresh, draft, user.isAdmin));
  }

  return NextResponse.json(serialize(job, draft, user.isAdmin));
}
