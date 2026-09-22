"use client";

import { Camera, Check, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "realistic", label: "Realista", icon: Camera },
  { id: "anime", label: "Anime", icon: Palette },
  { id: "cartoon", label: "Caricatura", icon: Sparkles },
];

export function StyleSelector({ value, onChange, disabled, allowed }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Estilo
      </span>
      {STYLES.map((style) => {
        const Icon = style.icon;
        const active = value === style.id;
        const available = !allowed || allowed.includes(style.id);
        return (
          <button
            key={style.id}
            type="button"
            aria-pressed={active}
            disabled={disabled || !available}
            title={available ? undefined : "No disponible en este modo"}
            onClick={() => available && onChange(style.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "border-blush-500 bg-blush-500 text-white shadow-sm shadow-blush-200"
                : "border-blush-200 glass text-ink-soft",
              available
                ? "hover:border-blush-300 hover:text-ink"
                : "cursor-not-allowed opacity-50",
              disabled && "opacity-60",
            )}
          >
            {active ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {style.label}
          </button>
        );
      })}
    </div>
  );
}
