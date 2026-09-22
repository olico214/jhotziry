import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invitations } from "@/lib/db/schema";
import { generateToken, hashToken } from "./tokens";

const INVITATION_DAYS = 7;

export async function createInvitation(email, invitedBy) {
  const token = generateToken();

  await db.insert(invitations).values({
    email: email.toLowerCase(),
    tokenHash: hashToken(token),
    invitedBy: invitedBy ?? null,
    expiresAt: new Date(Date.now() + INVITATION_DAYS * 86400000),
  });

  return token;
}

export async function getValidInvitation(token) {
  if (!token) return null;

  const [invite] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.tokenHash, hashToken(token)),
        isNull(invitations.usedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return invite ?? null;
}

export async function consumeInvitation(id) {
  await db
    .update(invitations)
    .set({ usedAt: new Date() })
    .where(eq(invitations.id, id));
}
