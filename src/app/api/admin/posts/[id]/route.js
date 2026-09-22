import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";

const schema = z.object({
  featured: z.boolean().optional(),
  status: z.enum(["published", "hidden"]).optional(),
});

export async function PATCH(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id } = await ctx.params;

  const patch = { updatedAt: new Date() };
  if (typeof parsed.data.featured === "boolean") {
    patch.featured = parsed.data.featured;
  }
  if (parsed.data.status) patch.status = parsed.data.status;

  const [updated] = await db
    .update(posts)
    .set(patch)
    .where(eq(posts.id, id))
    .returning({ id: posts.id });

  if (!updated) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
