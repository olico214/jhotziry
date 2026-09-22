import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accessRequests } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { createInvitation } from "@/lib/auth/invitations";
import { sendInvitationEmail } from "@/lib/auth/mail";
import { APP_NAME } from "@/lib/config";

export async function POST(request, ctx) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const admin = guard.user;

  const { id } = await ctx.params;

  const [accessRequest] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, id))
    .limit(1);

  if (!accessRequest) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  const token = await createInvitation(accessRequest.email, admin.id);

  const base = process.env.APP_URL || new URL(request.url).origin;
  const link = new URL("/registro", base);
  link.searchParams.set("token", token);

  const result = await sendInvitationEmail(
    accessRequest.email,
    link.toString(),
    APP_NAME,
  );

  await db
    .update(accessRequests)
    .set({ status: "invited", handledAt: new Date() })
    .where(eq(accessRequests.id, accessRequest.id));

  return NextResponse.json({
    ok: true,
    delivered: result.delivered,
    preview: result.delivered ? null : result.preview,
  });
}
