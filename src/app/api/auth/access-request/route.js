import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { accessRequests } from "@/lib/db/schema";
import { limitByIp } from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
});

export async function POST(request) {
  const limited = limitByIp(request, "access-request", 5, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Correo no válido" },
      { status: 400 },
    );
  }

  const email = parsed.data.email;

  const [existing] = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(
      and(eq(accessRequests.email, email), eq(accessRequests.status, "pending")),
    )
    .limit(1);

  if (!existing) {
    await db.insert(accessRequests).values({ email });
  }

  return NextResponse.json({ ok: true });
}
