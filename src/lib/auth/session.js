import { cookies } from "next/headers";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, sessions, users } from "@/lib/db/schema";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "jho_session";
export const DRAFT_COOKIE = "jho_draft";

const SESSION_DAYS = 30;

export function sessionCookieOptions(expires) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function issueSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);

  const [row] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    })
    .returning({ id: sessions.id });

  return { token, expiresAt, sessionId: row.id };
}

export async function createSession(userId) {
  const { token, expiresAt } = await issueSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return token;
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      csrfHash: sessions.csrfHash,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      address: users.address,
      isAdmin: users.isAdmin,
      credits: users.credits,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    address: session.address,
    isAdmin: session.isAdmin,
    credits: session.credits,
    createdAt: session.createdAt,
  };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }

  store.delete(SESSION_COOKIE);
}

export async function getDraftIdFromCookie() {
  const store = await cookies();
  return store.get(DRAFT_COOKIE)?.value ?? null;
}

export async function setDraftCookie(draftId) {
  const store = await cookies();
  store.set(DRAFT_COOKIE, draftId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function claimDraft(draftId, userId) {
  if (!draftId) return null;

  const rows = await db
    .update(drafts)
    .set({ userId, claimedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(drafts.id, draftId),
        or(isNull(drafts.userId), eq(drafts.userId, userId)),
      ),
    )
    .returning({ id: drafts.id });

  return rows[0] ?? null;
}
