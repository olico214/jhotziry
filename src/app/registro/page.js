import { getValidInvitation } from "@/lib/auth/invitations";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { APP_NAME } from "@/lib/config";

export const metadata = {
  title: "Completar registro",
};

export default async function RegistroPage({ searchParams }) {
  const params = await searchParams;
  const invite = await getValidInvitation(params?.token);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        Completa tu registro
      </h1>

      {invite ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Únete a {APP_NAME}. Usaremos estos datos para preparar tus pedidos.
          </p>
          <div className="mt-6">
            <RegisterForm token={params.token} email={invite.email} />
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-2xl glass-soft px-4 py-3 text-sm text-ink-soft">
          La invitación no es válida o ya expiró. Pide al administrador que te
          envíe una nueva.
        </p>
      )}
    </main>
  );
}
