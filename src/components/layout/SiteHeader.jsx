"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Coins,
  LogIn,
  LogOut,
  Menu,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { AuthModal } from "@/components/create/AuthModal";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/crear", label: "Crear" },
  { href: "/blog", label: "Blog" },
];

export function SiteHeader() {
  const { user, isAdmin, credits, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 glass-bar">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex min-w-0 items-center gap-2 text-lg font-extrabold tracking-tight text-ink"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blush-300 text-white shadow-md shadow-blush-200">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="truncate">{APP_NAME}</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}

          {user ? (
            <>
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-blush-200 glass px-3 py-1.5 text-xs font-semibold text-ink">
                <Coins className="h-3.5 w-3.5 text-blush-500" />
                {credits}
              </span>
              <NavLink href="/mis-pedidos">Mis pedidos</NavLink>
              {isAdmin ? (
                <NavLink href="/admin" className="text-blush-600">
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </NavLink>
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
            <Button size="md" onClick={() => setAuthOpen(true)}>
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Button>
          )}
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1.5 md:hidden">
          <MobileIconLink
            href="/crear"
            label="Crear"
            active={pathname === "/crear"}
          >
            <Wand2 className="h-5 w-5" />
          </MobileIconLink>
          <MobileIconLink
            href="/blog"
            label="Blog"
            active={pathname.startsWith("/blog")}
          >
            <Newspaper className="h-5 w-5" />
          </MobileIconLink>
          {user ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 glass px-2.5 py-1.5 text-xs font-semibold text-ink">
              <Coins className="h-3.5 w-3.5 text-blush-500" />
              {credits}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blush-200 glass text-ink"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile account menu */}
      {menuOpen ? (
        <nav className="mx-3 mb-3 flex flex-col gap-1 rounded-3xl glass-strong p-2 md:hidden">
          {user ? (
            <>
              <MobileLink href="/mis-pedidos" onNavigate={() => setMenuOpen(false)}>
                Mis pedidos
              </MobileLink>
              {isAdmin ? (
                <MobileLink
                  href="/admin"
                  onNavigate={() => setMenuOpen(false)}
                  className="text-blush-600"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Panel admin
                </MobileLink>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink-soft transition-colors hover:bg-blush-50 hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setAuthOpen(true);
              }}
              className="flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-blush-50"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </button>
          )}
        </nav>
      ) : null}

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} mode="login" />
    </header>
  );
}

function NavLink({ href, children, className }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold text-ink-soft transition-colors hover:bg-blush-50 hover:text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function MobileLink({ href, children, onNavigate, className }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-blush-50 hover:text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function MobileIconLink({ href, label, active, children }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
        active
          ? "border-blush-300 bg-blush-500 text-white"
          : "border-blush-200 glass text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
