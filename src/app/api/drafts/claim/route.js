import { NextResponse } from "next/server";
import { z } from "zod";
import { claimDraft } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guard";

const schema = z.object({ draftId: z.string().uuid() });

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Borrador inválido" }, { status: 400 });
  }

  const claimed = await claimDraft(parsed.data.draftId, guard.user.id);
  return NextResponse.json({ ok: true, claimed: Boolean(claimed) });
}
