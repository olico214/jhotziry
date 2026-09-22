import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ensureCsrf } from "@/lib/auth/csrf";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  await ensureCsrf(session);

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      fullName: session.fullName,
      address: session.address,
      isAdmin: session.isAdmin,
      credits: session.credits,
    },
  });
}
