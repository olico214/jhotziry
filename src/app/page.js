import { Landing } from "@/components/landing/Landing";
import { listPosts } from "@/lib/posts/queries";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const featured = await listPosts({ featuredOnly: true, limit: 3 });

  return (
    <Landing accessNotice={params?.acceso ?? null} featured={featured} />
  );
}
