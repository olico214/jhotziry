import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { createInvitation } from "@/lib/auth/invitations";
import { sendInvitationEmail } from "@/lib/auth/mail";
import { APP_NAME } from "@/lib/config";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
});

export async function POST(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const admin = guard.user;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Correo no válido" },
      { status: 400 },
    );
  }

  const email = parsed.data.email;
  const token = await createInvitation(email, admin.id);

  const base = process.env.APP_URL || new URL(request.url).origin;
  const link = new URL("/registro", base);
  link.searchParams.set("token", token);

  const result = await sendInvitationEmail(email, link.toString(), APP_NAME);

  return NextResponse.json({
    ok: true,
    delivered: result.delivered,
    preview: result.delivered ? null : result.preview,
  });
}
