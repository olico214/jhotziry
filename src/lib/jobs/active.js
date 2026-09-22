import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, generationJobs } from "@/lib/db/schema";

export async function hasActiveJob(userId) {
  if (!userId) return false;

  const rows = await db
    .select({ id: generationJobs.id })
    .from(generationJobs)
    .innerJoin(drafts, eq(drafts.id, generationJobs.draftId))
    .where(
      and(
        eq(drafts.userId, userId),
        inArray(generationJobs.status, ["queued", "processing"]),
      ),
    )
    .limit(1);

  return rows.length > 0;
}
