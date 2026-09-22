import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { postComments, posts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";

const schema = z.object({
  body: z.string().trim().min(1, "Escribe un comentario").max(1000),
});

export async function POST(request, ctx) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;
  const { user } = guard;

  const limited = limitByKey("posts:comment", user.id, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Comentario inválido" },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
  }

  const [created] = await db
    .insert(postComments)
    .values({ postId: id, userId: user.id, body: parsed.data.body })
    .returning({ id: postComments.id });

  return NextResponse.json({ ok: true, id: created.id });
}
