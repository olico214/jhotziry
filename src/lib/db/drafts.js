import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { setDraftCookie } from "@/lib/auth/session";

export async function getDraft(id) {
  if (!id) return null;
  const rows = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function ensureDraft(id) {
  const existing = await getDraft(id);
  if (existing) {
    await setDraftCookie(existing.id);
    return existing;
  }

  const [created] = await db.insert(drafts).values({}).returning();
  await setDraftCookie(created.id);
  return created;
}

export async function resolveUserDraft(userId, draftId) {
  if (draftId) {
    const draft = await getDraft(draftId);
    const used =
      draft &&
      (draft.previewImage ||
        draft.previewImageKey ||
        draft.previewPath ||
        draft.sourceImage ||
        draft.sourceImageKey ||
        draft.sourceImagePath ||
        draft.modelPath);

    if (!used && draft && (draft.userId === null || draft.userId === userId)) {
      if (draft.userId === null) {
        await db
          .update(drafts)
          .set({ userId, claimedAt: new Date(), updatedAt: new Date() })
          .where(eq(drafts.id, draft.id));
      }
      return draft;
    }
  }

  const [created] = await db.insert(drafts).values({ userId }).returning();
  return created;
}

export function canAccessDraft(draft, user) {
  if (!draft || !user) return false;
  if (user.isAdmin) return true;
  return draft.userId === user.id;
}
