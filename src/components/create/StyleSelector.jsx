"use client";

import { Camera, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "realistic", label: "Realista", icon: Camera, available: true },
  { id: "anime", label: "Anime", icon: Palette, available: false },
  { id: "cartoon", label: "Caricatura", icon: Sparkles, available: false },
];

export function StyleSelector({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Estilo
      </span>
      {STYLES.map((style) => {
        const Icon = style.icon;
        const active = value === style.id;
        return (
          <button
            key={style.id}
            type="button"
            disabled={disabled || !style.available}
            onClick={() => style.available && onChange(style.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "border-blush-400 bg-blush-100 text-blush-700"
                : "border-blush-200 bg-white/70 text-ink-soft hover:border-blush-300",
              !style.available && "cursor-not-allowed opacity-60",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {style.label}
            {!style.available ? (
              <span className="rounded-full bg-blush-200/70 px-1.5 py-0.5 text-[10px] text-blush-700">
                Pronto
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
