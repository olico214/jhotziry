import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession, getSession } from "@/lib/auth/session";
import { CSRF_COOKIE, verifyCsrf } from "@/lib/auth/csrf";

export async function POST(request) {
  const session = await getSession();
  if (session && !(await verifyCsrf(request, session))) {
    return NextResponse.json(
      { error: "Token de seguridad inválido." },
      { status: 403 },
    );
  }

  await destroySession();

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(CSRF_COOKIE);
  return response;
}
