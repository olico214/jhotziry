import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { drafts, orders, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/?acceso=requerido");

  const [userRows, orderRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
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
  ]);

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

      <AdminDashboard users={userRows} orders={orderRows} />
    </main>
  );
}
