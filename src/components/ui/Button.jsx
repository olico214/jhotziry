"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-gradient-to-b from-blush-400 to-blush-600 text-white ring-1 ring-inset ring-white/40 shadow-lg shadow-blush-300/60 hover:from-blush-500 hover:to-blush-700 hover:shadow-blush-300 active:scale-[.98]",
  secondary:
    "glass text-ink border border-blush-200 hover:border-blush-300 hover:bg-white active:scale-[.98]",
  ghost: "text-ink-soft hover:text-ink hover:bg-blush-50",
};

const sizes = {
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
  icon: "h-10 w-10",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading = false,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blush-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
