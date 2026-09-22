import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications, users } from "@/lib/db/schema";
import { adminEmails } from "@/lib/auth/roles";

export async function notify(userId, { type, title, body, link }) {
  if (!userId) return;

  await db.insert(notifications).values({
    userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
  });
}

export async function notifyAdmins(payload, excludeUserId) {
  const emails = adminEmails();
  if (!emails.length) return;

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, emails));

  for (const row of rows) {
    if (row.id === excludeUserId) continue;
    await notify(row.id, payload);
  }
}
