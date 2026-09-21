"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, LogIn, LogOut, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { AuthModal } from "@/components/create/AuthModal";
import { useSession } from "@/hooks/useSession";

export function SiteHeader() {
  const { user, isAdmin, credits, logout } = useSession();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-blush-100/70 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blush-300 text-white shadow-md shadow-blush-200">
            <Sparkles className="h-4 w-4" />
          </span>
          {APP_NAME}
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/crear"
            className="rounded-full px-4 py-2 font-semibold text-ink-soft transition-colors hover:bg-blush-50 hover:text-ink"
          >
            Crear
          </Link>

          {user ? (
            <>
              <span className="hidden items-center gap-1.5 rounded-full border border-blush-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink sm:inline-flex">
                <Coins className="h-3.5 w-3.5 text-blush-500" />
                {credits}
              </span>
              <Link
                href="/mis-disenos"
                className="rounded-full px-4 py-2 font-semibold text-ink-soft transition-colors hover:bg-blush-50 hover:text-ink"
              >
                Mis diseños
              </Link>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold text-blush-600 transition-colors hover:bg-blush-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold text-ink-soft transition-colors hover:bg-blush-50 hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </>
          ) : (
            <>
              <Button
                size="md"
                variant="secondary"
                className="hidden sm:inline-flex"
                onClick={() => openAuth("signup")}
              >
                <UserPlus className="h-4 w-4" />
                Crear cuenta
              </Button>
              <Button size="md" onClick={() => openAuth("login")}>
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </Button>
            </>
          )}
        </nav>
      </div>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
      />
    </header>
  );
}
