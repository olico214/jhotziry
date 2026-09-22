import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { readBuffer } from "@/lib/storage/files";

export async function GET(request, ctx) {
  const { id } = await ctx.params;
  const kind = new URL(request.url).searchParams.get("kind");

  const user = await getCurrentUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return new Response("Pedido no encontrado", { status: 404 });
  }

  const isOwner = order.userId === user.id;

  if (kind === "edited") {
    if (!order.editedModelPath) {
      return new Response("Modelo no encontrado", { status: 404 });
    }
    if (!user.isAdmin && !isOwner) {
      return new Response("No autorizado", { status: 403 });
    }
    return serve(order.editedModelPath);
  }

  if (kind === "color") {
    if (!user.isAdmin) {
      return new Response("No autorizado", { status: 403 });
    }
    if (!order.colorModelPath) {
      return new Response("Modelo no encontrado", { status: 404 });
    }
    return serve(order.colorModelPath);
  }

  return new Response("Tipo inválido", { status: 400 });
}

async function serve(filePath) {
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
