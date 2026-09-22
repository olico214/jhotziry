import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { postLikes, posts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";

export async function POST(request, ctx) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;
  const { user } = guard;

  const limited = limitByKey("posts:like", user.id, 60, 60 * 60 * 1000);
  if (limited) return limited;

  const { id } = await ctx.params;

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: postLikes.id })
    .from(postLikes)
    .where(and(eq(postLikes.postId, id), eq(postLikes.userId, user.id)))
    .limit(1);

  if (existing) {
    await db.delete(postLikes).where(eq(postLikes.id, existing.id));
    return NextResponse.json({ liked: false });
  }

  await db.insert(postLikes).values({ postId: id, userId: user.id });
  return NextResponse.json({ liked: true });
}
