import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guard";

export async function GET(request) {
  const guard = await requireUser(request, { csrf: false });
  if (guard.error) return guard.error;

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, guard.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const [unreadRow] = await db
    .select({ count: sql`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, guard.user.id),
        isNull(notifications.readAt),
      ),
    );

  return NextResponse.json({
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      read: Boolean(row.readAt),
      createdAt: new Date(row.createdAt).toISOString(),
    })),
    unread: Number(unreadRow?.count || 0),
  });
}
