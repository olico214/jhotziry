import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guard";
import { limitByKey } from "@/lib/security/rate-limit";
import { notifyAdmins } from "@/lib/notifications";
import { listPosts } from "@/lib/posts/queries";
import { extensionFor } from "@/lib/storage/files";
import { imageRecordFromBuffer, mimeFromExtension } from "@/lib/storage/images";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function parseTags(value) {
  const seen = new Set();
  const tags = [];
  for (const raw of String(value || "").split(",")) {
    const tag = raw.trim().replace(/^#/, "").toLowerCase().slice(0, 24);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
    if (tags.length >= 6) break;
  }
  return tags;
}

export async function GET() {
  const user = await getCurrentUser();
  const list = await listPosts({ viewerId: user?.id ?? null });
  return NextResponse.json({ posts: list });
}

export async function POST(request) {
  const guard = await requireUser(request);
  if (guard.error) return guard.error;
  const { user } = guard;

  const limited = limitByKey("posts:create", user.id, 10, 60 * 60 * 1000);
  if (limited) return limited;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const title = String(form.get("title") || "").trim().slice(0, 160);
  const body = String(form.get("body") || "").trim().slice(0, 2000);
  const tags = parseTags(form.get("tags"));
  const file = form.get("image");

  let image = null;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen" },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "La imagen supera los 8 MB" },
        { status: 413 },
      );
    }
    const extension = extensionFor(file);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Usa una imagen PNG, JPG o WEBP" },
        { status: 415 },
      );
    }
    image = imageRecordFromBuffer(
      Buffer.from(await file.arrayBuffer()),
      mimeFromExtension(extension),
    );
  }

  if (!image && !title && !body && tags.length === 0) {
    return NextResponse.json(
      { error: "Agrega una imagen, escribe algo o pon una etiqueta." },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(posts)
    .values({
      userId: user.id,
      title: title || null,
      body: body || null,
      tags: tags.length ? tags : null,
      image,
    })
    .returning({ id: posts.id });

  await notifyAdmins({
    type: "new_post",
    title: "Nueva publicación en el blog",
    body: `${user.fullName || "Alguien"}: ${(title || body || "").slice(0, 100)}`,
    link: `/blog#post-${created.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: created.id });
}
