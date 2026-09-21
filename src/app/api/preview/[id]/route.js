import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessDraft } from "@/lib/db/drafts";
import { contentTypeFor, readBuffer } from "@/lib/storage/files";

export async function GET(_request, ctx) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, id))
    .limit(1);

  if (!draft?.previewPath) {
    return new Response("Vista previa no encontrada", { status: 404 });
  }

  if (!canAccessDraft(draft, user)) {
    return new Response("No autorizado", { status: 403 });
  }

  try {
    const buffer = await readBuffer(draft.previewPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentTypeFor(draft.previewPath),
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
}
