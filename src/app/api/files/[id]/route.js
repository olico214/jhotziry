import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { readBuffer } from "@/lib/storage/files";

export async function GET(_request, ctx) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return new Response("No autorizado", { status: 403 });
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, id))
    .limit(1);

  if (!draft?.modelPath) {
    return new Response("Modelo no encontrado", { status: 404 });
  }

  try {
    const buffer = await readBuffer(draft.modelPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="modelo-${draft.id}.glb"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
}
