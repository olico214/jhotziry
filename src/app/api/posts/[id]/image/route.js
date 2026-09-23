import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";
import { bufferFromImageRecord } from "@/lib/storage/images";
import { buildPublicUrl } from "@/lib/storage/object-store";

export async function GET(_request, ctx) {
  const { id } = await ctx.params;

  const [post] = await db
    .select({ image: posts.image, imageKey: posts.imageKey })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (post?.imageKey) {
    const url = buildPublicUrl(post.imageKey);
    if (url) return Response.redirect(url, 302);
  }

  if (!post?.image?.data) {
    return new Response("Imagen no encontrada", { status: 404 });
  }

  const buffer = bufferFromImageRecord(post.image);
  return new Response(buffer, {
    headers: {
      "Content-Type": post.image.mime || "image/png",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=600",
    },
  });
}
