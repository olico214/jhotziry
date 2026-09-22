import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";

export async function GET(request) {
  const guard = await requireUser(request, { csrf: false });
  if (guard.error) return guard.error;

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, guard.user.id),
        isNull(notifications.readAt),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return NextResponse.json({
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      read: false,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    unread: rows.length,
  });
}
