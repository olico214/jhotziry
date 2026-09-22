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

async function resolveImage(draft) {
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
  const [job] = await db
    .insert(generationJobs)
    .values({
      draftId: draft.id,
      type: "model",
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

    await db
      .update(orders)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: "generating",
      note: "Preparando el modelo 3D",
    });

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (error) {
    await db
      .update(generationJobs)
      .set({ status: "failed", error: error.message, updatedAt: new Date() })
      .where(eq(generationJobs.id, job.id));

    await db
      .update(orders)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: "failed",
      note: error.message,
    });

    console.error("[admin:generate] error:", error.message);
    return NextResponse.json(
      { error: "No se pudo iniciar la generación del modelo." },
      { status: 502 },
    );
  }
}
