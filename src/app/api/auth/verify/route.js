import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { magicLinks, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import {
  SESSION_COOKIE,
  claimDraft,
  getDraftIdFromCookie,
  issueSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  CSRF_COOKIE,
  createCsrfForSession,
  csrfCookieOptions,
} from "@/lib/auth/csrf";

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const draftParam = url.searchParams.get("draft");
  const base = process.env.APP_URL || url.origin;

  const fail = (reason) =>
    NextResponse.redirect(new URL(`/?acceso=${reason}`, base));

  if (!token) return fail("invalido");

  const [link] = await db
    .select()
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.tokenHash, hashToken(token)),
        isNull(magicLinks.usedAt),
        gt(magicLinks.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!link) return fail("expirado");

  await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(eq(magicLinks.id, link.id));

  await db
    .update(users)
    .set({ verifiedAt: new Date() })
    .where(eq(users.id, link.userId));

  const {
    token: sessionToken,
    expiresAt,
    sessionId,
  } = await issueSession(link.userId);
  const csrfToken = await createCsrfForSession(sessionId);

  const draftId = draftParam || (await getDraftIdFromCookie());
  const claimed = await claimDraft(draftId, link.userId);

  const destination = claimed ? "/mis-pedidos" : "/crear";
  const response = NextResponse.redirect(new URL(destination, base));
  response.cookies.set(
    SESSION_COOKIE,
    sessionToken,
    sessionCookieOptions(expiresAt),
  );
  response.cookies.set(CSRF_COOKIE, csrfToken, csrfCookieOptions());

  return response;
}
