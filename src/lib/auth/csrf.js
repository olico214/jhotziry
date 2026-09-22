import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { generateToken, hashToken } from "./tokens";

export const CSRF_COOKIE = "jho_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function newCsrfToken() {
  return generateToken();
}

export async function storeCsrfForSession(sessionId, token) {
  await db
    .update(sessions)
    .set({ csrfHash: hashToken(token) })
    .where(eq(sessions.id, sessionId));
}

export async function createCsrfForSession(sessionId) {
  const token = newCsrfToken();
  await storeCsrfForSession(sessionId, token);
  return token;
}

export async function setCsrfCookie(token) {
  const store = await cookies();
  store.set(CSRF_COOKIE, token, csrfCookieOptions());
}

export async function ensureCsrf(session) {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;

  if (session.csrfHash && existing && hashToken(existing) === session.csrfHash) {
    return existing;
  }

  const token = newCsrfToken();
  await storeCsrfForSession(session.sessionId, token);
  store.set(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
}

export async function verifyCsrf(request, session) {
  const method = (request.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const header = request.headers.get(CSRF_HEADER);
  const cookie = (await cookies()).get(CSRF_COOKIE)?.value;

  if (!header || !cookie || header !== cookie) return false;
  if (!session.csrfHash) return false;

  return hashToken(header) === session.csrfHash;
}
