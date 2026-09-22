import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { postComments, posts, users } from "@/lib/db/schema";

export async function listPosts({
  featuredOnly = false,
  limit = 50,
  viewerId = null,
} = {}) {
  const likeCount =
    sql`(select count(*) from post_likes pl where pl.post_id = ${posts.id})`.as(
      "like_count",
    );
  const commentCount =
    sql`(select count(*) from post_comments pc where pc.post_id = ${posts.id})`.as(
      "comment_count",
    );
  const liked = viewerId
    ? sql`exists(select 1 from post_likes pl2 where pl2.post_id = ${posts.id} and pl2.user_id = ${viewerId})`.as(
        "liked",
      )
    : sql`false`.as("liked");

  const where = featuredOnly
    ? and(eq(posts.status, "published"), eq(posts.featured, true))
    : eq(posts.status, "published");

  const rows = await db
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
      likeCount,
      commentCount,
      liked,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(where)
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    hasImage: Boolean(row.image),
    image: undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    liked: Boolean(row.liked),
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export async function listComments(postIds) {
  if (!postIds.length) return [];

  const rows = await db
    .select({
      id: postComments.id,
      postId: postComments.postId,
      body: postComments.body,
      createdAt: postComments.createdAt,
    })
    .from(postComments)
    .where(inArray(postComments.postId, postIds))
    .orderBy(asc(postComments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    body: row.body,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
