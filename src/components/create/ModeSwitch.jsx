"use client";

import { ImageIcon, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const modes = [
  { id: "text", label: "Texto a 3D", icon: Type },
  { id: "image", label: "Imagen a 3D", icon: ImageIcon },
];

export function ModeSwitch({ mode, onChange }) {
  return (
    <div className="inline-flex w-full rounded-full border border-blush-100 glass p-1 sm:w-auto">
      {modes.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all sm:flex-none",
              active
                ? "bg-blush-400 text-white shadow-md shadow-blush-200"
                : "text-ink-soft hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
