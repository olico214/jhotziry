import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessDraft } from "@/lib/db/drafts";
import { contentTypeFor, readBuffer } from "@/lib/storage/files";
import { bufferFromImageRecord } from "@/lib/storage/images";

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

  if (!draft?.previewImage && !draft?.previewPath) {
    return new Response("Vista previa no encontrada", { status: 404 });
  }

  if (!canAccessDraft(draft, user)) {
    return new Response("No autorizado", { status: 403 });
  }

  if (draft.previewImage) {
    const buffer = bufferFromImageRecord(draft.previewImage);
    return new Response(buffer, {
      headers: {
        "Content-Type": draft.previewImage.mime || "image/png",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=300",
      },
    });
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
