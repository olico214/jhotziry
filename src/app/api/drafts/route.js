import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { ensureDraft } from "@/lib/db/drafts";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST() {
  const draft = await ensureDraft(null);
  return NextResponse.json({ draftId: draft.id });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const rows = await db
    .select()
    .from(drafts)
    .where(eq(drafts.userId, user.id))
    .orderBy(desc(drafts.createdAt));

  return NextResponse.json({ drafts: rows });
}
