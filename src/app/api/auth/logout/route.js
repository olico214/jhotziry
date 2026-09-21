import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession } from "@/lib/auth/session";

export async function POST() {
  await destroySession();
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
