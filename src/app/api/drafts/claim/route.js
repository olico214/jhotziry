import { NextResponse } from "next/server";
import { z } from "zod";
import { claimDraft, getCurrentUser } from "@/lib/auth/session";

const schema = z.object({ draftId: z.string().uuid() });

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Borrador inválido" }, { status: 400 });
  }

  const claimed = await claimDraft(parsed.data.draftId, user.id);
  return NextResponse.json({ ok: true, claimed: Boolean(claimed) });
}
