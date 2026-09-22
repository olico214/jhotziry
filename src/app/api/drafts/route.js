import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { ensureDraft } from "@/lib/db/drafts";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;

  const limited = limitByKey("drafts:create", guard.user.id, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const draft = await ensureDraft(null);
  return NextResponse.json({ draftId: draft.id });
}

export async function GET(request) {
  const guard = await requireUser(request, { csrf: false });
  if (guard.error) return guard.error;

  const rows = await db
    .select()
    .from(drafts)
    .where(eq(drafts.userId, guard.user.id))
    .orderBy(desc(drafts.createdAt));

  return NextResponse.json({ drafts: rows });
}
