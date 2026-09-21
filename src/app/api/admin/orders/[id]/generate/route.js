import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import path from "node:path";
import { db } from "@/lib/db/client";
import { drafts, generationJobs, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getProvider } from "@/lib/ai/provider";
import { ensureRunner } from "@/lib/jobs/runner";
import { readBuffer } from "@/lib/storage/files";

export async function POST(_request, ctx) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

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

  const imagePath = draft?.previewPath || draft?.sourceImagePath;
  if (!imagePath) {
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
      status: "processing",
      progress: 0,
      provider: provider.name,
    })
    .returning();

  try {
    const imageBuffer = await readBuffer(imagePath);
    const imageExtension = path.extname(imagePath).slice(1) || "png";

    const { stage, providerTaskId } = await provider.start({
      mode: "model",
      imageBuffer,
      imageExtension,
    });

    await db
      .update(generationJobs)
      .set({ stage, providerJobId: providerTaskId, updatedAt: new Date() })
      .where(eq(generationJobs.id, job.id));

    await db
      .update(orders)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

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

    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
