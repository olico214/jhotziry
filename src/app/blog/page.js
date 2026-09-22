import { getCurrentUser } from "@/lib/auth/session";
import { listComments, listPosts } from "@/lib/posts/queries";
import { BlogFeed } from "@/components/blog/BlogFeed";

export const metadata = {
  title: "Blog",
};

export default async function BlogPage() {
  const user = await getCurrentUser();
  const posts = await listPosts({ viewerId: user?.id ?? null });
  const comments = await listComments(posts.map((post) => post.id));

  const grouped = new Map();
  for (const comment of comments) {
    const list = grouped.get(comment.postId) || [];
    list.push(comment);
    grouped.set(comment.postId, list);
  }

  const feed = posts.map((post) => ({
    ...post,
    comments: grouped.get(post.id) || [],
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Blog de creaciones
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Comparte tus diseños, inspírate y comenta las creaciones de la
          comunidad.
        </p>
      </div>

      <BlogFeed
        posts={feed}
        viewer={{ id: user?.id ?? null, isAdmin: Boolean(user?.isAdmin) }}
      />
    </main>
  );
}
