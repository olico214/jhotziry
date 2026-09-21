import { Landing } from "@/components/landing/Landing";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  return <Landing accessNotice={params?.acceso ?? null} />;
}
