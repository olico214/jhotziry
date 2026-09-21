import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveUserDraft } from "@/lib/db/drafts";
import { describeImagePrompt, isEnhanceEnabled } from "@/lib/ai/deepseek";
import { extensionFor, saveBuffer } from "@/lib/storage/files";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const draftIdSchema = z.string().uuid().nullish();

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Inicia sesión para guardar tu foto." },
      { status: 401 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const file = form.get("image");
  const draftId = draftIdSchema.safeParse(form.get("draftId") || undefined);

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Sube una imagen válida" }, { status: 400 });
  }

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

  const draft = await resolveUserDraft(
    user.id,
    draftId.success ? draftId.data : undefined,
  );

  const sourcePath = `uploads/${draft.id}/original${extension}`;
  await saveBuffer(sourcePath, Buffer.from(await file.arrayBuffer()));

  let summary = null;
  if (isEnhanceEnabled()) {
    try {
      const described = await describeImagePrompt(sourcePath);
      summary = described?.summary ?? null;
    } catch (error) {
      console.error("[ai] DeepSeek no disponible:", error.message);
    }
  }

  await db
    .update(drafts)
    .set({
      mode: "image",
      prompt: null,
      enhancedPrompt: null,
      aiSummary: summary,
      sourceImagePath: sourcePath,
      previewPath: sourcePath,
      modelPath: null,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(eq(drafts.id, draft.id));

  return NextResponse.json({
    draftId: draft.id,
    previewUrl: `/api/preview/${draft.id}?v=${Date.now()}`,
    summary,
  });
}
