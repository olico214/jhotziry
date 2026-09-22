import { NextResponse } from "next/server";
import { getSession } from "./session";
import { verifyCsrf } from "./csrf";

function sessionUser(session) {
  return {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    address: session.address,
    isAdmin: session.isAdmin,
    credits: session.credits,
  };
}

export async function requireUser(request, { csrf = true } = {}) {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Inicia sesión para continuar." },
        { status: 401 },
      ),
    };
  }

  if (csrf && !(await verifyCsrf(request, session))) {
    return {
      error: NextResponse.json(
        { error: "Token de seguridad inválido. Recarga la página." },
        { status: 403 },
      ),
    };
  }

  return { session, user: sessionUser(session) };
}

export async function requireAdmin(request, { csrf = true } = {}) {
  const result = await requireUser(request, { csrf });
  if (result.error) return result;

  if (!result.user.isAdmin) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
    };
  }

  return result;
}
