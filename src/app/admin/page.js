import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accessRequests,
  drafts,
  invitations,
  orders,
  posts,
  users,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();

  const [userRows, orderRows, invitationRows, requestRows, postRows] =
    await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        address: users.address,
        isAdmin: users.isAdmin,
        credits: users.credits,
        createdAt: users.createdAt,
        verifiedAt: users.verifiedAt,
        activeSessions: sql`(select count(*) from sessions s where s.user_id = ${users.id} and s.expires_at > now())`.as(
          "active_sessions",
        ),
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
    db
      .select({ order: orders, draft: drafts, email: users.email })
      .from(orders)
      .innerJoin(drafts, eq(drafts.id, orders.draftId))
      .innerJoin(users, eq(users.id, orders.userId))
      .orderBy(desc(orders.createdAt)),
    db
      .select()
      .from(invitations)
      .orderBy(desc(invitations.createdAt))
      .limit(50),
    db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.status, "pending"))
      .orderBy(desc(accessRequests.createdAt)),
    db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        tags: posts.tags,
        image: posts.image,
        featured: posts.featured,
        status: posts.status,
        createdAt: posts.createdAt,
        author: users.fullName,
        authorEmail: users.email,
        likeCount:
          sql`(select count(*) from post_likes pl where pl.post_id = ${posts.id})`.as(
            "like_count",
          ),
        commentCount:
          sql`(select count(*) from post_comments pc where pc.post_id = ${posts.id})`.as(
            "comment_count",
          ),
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.userId))
      .orderBy(desc(posts.createdAt))
      .limit(100),
  ]);

  const serializedPosts = postRows.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    tags: Array.isArray(post.tags) ? post.tags : [],
    featured: post.featured,
    status: post.status,
    author: post.author || post.authorEmail,
    hasImage: Boolean(post.image),
    likeCount: Number(post.likeCount),
    commentCount: Number(post.commentCount),
    createdAt: new Date(post.createdAt).toISOString(),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Panel de administración
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Gestiona créditos de usuarios y convierte pedidos en modelos 3D.
        </p>
      </div>

      <AdminDashboard
        users={userRows}
        orders={orderRows}
        invitations={invitationRows}
        accessRequests={requestRows}
        posts={serializedPosts}
      />
    </main>
  );
}
