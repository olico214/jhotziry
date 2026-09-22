import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creditTransactions, users } from "@/lib/db/schema";
import { consumeInvitation, getValidInvitation } from "@/lib/auth/invitations";
import {
  SESSION_COOKIE,
  issueSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  CSRF_COOKIE,
  createCsrfForSession,
  csrfCookieOptions,
} from "@/lib/auth/csrf";
import { limitByIp } from "@/lib/security/rate-limit";

const schema = z.object({
  token: z.string().min(10),
  fullName: z.string().trim().min(3, "Escribe tu nombre completo").max(160),
  address: z.string().trim().min(5, "Escribe tu domicilio").max(300),
});

export async function POST(request) {
  const limited = limitByIp(request, "register", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos" },
      { status: 400 },
    );
  }

  const { token, fullName, address } = parsed.data;
  const invite = await getValidInvitation(token);
  if (!invite) {
    return NextResponse.json(
      { error: "La invitación no es válida o ya expiró." },
      { status: 400 },
    );
  }

  const email = invite.email;
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    [user] = await db
      .update(users)
      .set({ fullName, address })
      .where(eq(users.id, user.id))
      .returning();
  } else {
    const welcome = Number(process.env.WELCOME_CREDITS || 0);
    [user] = await db
      .insert(users)
      .values({ email, fullName, address, credits: welcome })
      .returning();

    if (welcome > 0) {
      await db.insert(creditTransactions).values({
        userId: user.id,
        amount: welcome,
        balanceAfter: welcome,
        reason: "Creditos de bienvenida",
      });
    }
  }

  await consumeInvitation(invite.id);

  const {
    token: sessionToken,
    expiresAt,
    sessionId,
  } = await issueSession(user.id);
  const csrfToken = await createCsrfForSession(sessionId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    sessionToken,
    sessionCookieOptions(expiresAt),
  );
  response.cookies.set(CSRF_COOKIE, csrfToken, csrfCookieOptions());
  return response;
}
