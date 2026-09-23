import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import path from "node:path";
import { db } from "@/lib/db/client";
import { drafts, generationJobs, orderEvents, orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { getProvider } from "@/lib/ai/provider";
import { ensureRunner } from "@/lib/jobs/runner";
import { readBuffer } from "@/lib/storage/files";
import { bufferFromImageRecord } from "@/lib/storage/images";
import { getObject, isObjectStoreConfigured } from "@/lib/storage/object-store";

const PLANS = {
  textured: [{ type: "model", parts: false, label: "texturizado" }],
  parts: [{ type: "model_parts", parts: true, label: "por partes" }],
  both: [
    { type: "model", parts: false, label: "texturizado" },
    { type: "model_parts", parts: true, label: "por partes" },
  ],
};

async function resolveImage(draft) {
  const key = draft?.previewImageKey || draft?.sourceImageKey;
  if (key && isObjectStoreConfigured()) {
    try {
      const { buffer, contentType } = await getObject(key);
      const extension =
        path.extname(key).slice(1) ||
        (contentType.split("/")[1] || "png");
      return { buffer, extension };
    } catch (error) {
      console.error("[storage] model source fetch:", error.message);
    }
  }

  const record = draft?.previewImage || draft?.sourceImage;
  if (record) {
    return {
      buffer: bufferFromImageRecord(record),
      extension:
        (record.mime && String(record.mime).split("/")[1]) || "png",
    };
  }

  const imagePath = draft?.previewPath || draft?.sourceImagePath;
  if (!imagePath) return null;

  return {
    buffer: await readBuffer(imagePath),
    extension: path.extname(imagePath).slice(1) || "png",
  };
}

export async function POST(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  const payload = await request.json().catch(() => ({}));
  const mode = ["textured", "parts", "both"].includes(payload?.mode)
    ? payload.mode
    : payload?.parts
      ? "parts"
      : "textured";
  const plan = PLANS[mode];

  const { id } = await ctx.params;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, order.draftId))
    .limit(1);

  const image = await resolveImage(draft);
  if (!image) {
    return NextResponse.json(
      { error: "El diseño no tiene imagen para convertir" },
      { status: 400 },
    );
  }

  const provider = getProvider();
  ensureRunner();

  const started = [];
  const failed = [];

  for (const item of plan) {
    const [job] = await db
      .insert(generationJobs)
      .values({
        draftId: draft.id,
        type: item.type,
        status: "queued",
        progress: 0,
        provider: provider.name,
      })
      .returning();

    try {
      const { stage, providerTaskId } = await provider.start({
        mode: "model",
        imageBuffer: image.buffer,
        imageExtension: image.extension,
        parts: item.parts,
      });

      await db
        .update(generationJobs)
        .set({
          stage,
          providerJobId: providerTaskId,
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));

      started.push(job.id);
    } catch (error) {
      await db
        .update(generationJobs)
        .set({ status: "failed", error: error.message, updatedAt: new Date() })
        .where(eq(generationJobs.id, job.id));

      failed.push(item.label);
      console.error("[admin:generate] error:", error.message);
    }
  }

  if (started.length === 0) {
    await db
      .update(orders)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: "failed",
      note: "No se pudo iniciar la generación del modelo.",
    });

    return NextResponse.json(
      { error: "No se pudo iniciar la generación del modelo." },
      { status: 502 },
    );
  }

  await db
    .update(orders)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    orderId: order.id,
    status: "generating",
    note:
      plan.length > 1
        ? "Generando modelos 3D (texturizado y por partes)"
        : `Generando modelo ${plan[0].label}`,
  });

  return NextResponse.json({ ok: true, jobIds: started, failed });
}
