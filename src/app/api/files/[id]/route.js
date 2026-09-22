import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { readBuffer } from "@/lib/storage/files";

export async function GET(request, ctx) {
  const { id } = await ctx.params;
  const kind = new URL(request.url).searchParams.get("kind");

  const user = await getCurrentUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, id))
    .limit(1);

  const filePath = kind === "parts" ? draft?.modelPartsPath : draft?.modelPath;

  if (!filePath) {
    return new Response("Modelo no encontrado", { status: 404 });
  }

  if (!user.isAdmin && draft.userId !== user.id) {
    return new Response("No autorizado", { status: 403 });
  }

  try {
    const buffer = await readBuffer(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
}
