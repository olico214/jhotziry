import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creditTransactions, magicLinks, users } from "@/lib/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { getDraftIdFromCookie } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/roles";
import { sendMagicLink } from "@/lib/auth/mail";
import { limitByIp, limitByKey } from "@/lib/security/rate-limit";
import { APP_NAME } from "@/lib/config";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
});

const GENERIC = { ok: true, delivered: true, preview: null };

export async function POST(request) {
  const ipLimited = limitByIp(request, "request-link:ip", 5, 15 * 60 * 1000);
  if (ipLimited) return ipLimited;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Correo no válido" },
      { status: 400 },
    );
  }

  const email = parsed.data.email;

  const emailLimited = limitByKey(
    "request-link:email",
    email,
    3,
    15 * 60 * 1000,
  );
  if (emailLimited) return emailLimited;

  const shouldBeAdmin = isAdminEmail(email);

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user && !shouldBeAdmin) {
    return NextResponse.json(GENERIC);
  }

  if (!user) {
    const welcome = Number(process.env.WELCOME_CREDITS || 0);
    [user] = await db
      .insert(users)
      .values({
        email,
        credits: welcome,
        isAdmin: true,
      })
      .returning();

    if (welcome > 0) {
      await db.insert(creditTransactions).values({
        userId: user.id,
        amount: welcome,
        balanceAfter: welcome,
        reason: "Creditos de bienvenida",
      });
    }
  } else if (shouldBeAdmin && !user.isAdmin) {
    [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, user.id))
      .returning();
  }

  const token = generateToken();
  await db.insert(magicLinks).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 15 * 60000),
  });

  const draftId = await getDraftIdFromCookie();
  const base = process.env.APP_URL || new URL(request.url).origin;
  const link = new URL("/api/auth/verify", base);
  link.searchParams.set("token", token);
  if (draftId) link.searchParams.set("draft", draftId);

  const result = await sendMagicLink(email, link.toString(), APP_NAME);

  return NextResponse.json({
    ok: true,
    delivered: result.delivered,
    preview: result.delivered ? null : result.preview,
  });
}
