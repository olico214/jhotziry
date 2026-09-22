"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-blush-800/25 backdrop-blur-md" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-4xl border border-blush-100 glass-strong p-6 shadow-2xl shadow-blush-200/60 sm:p-8",
            className,
          )}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              {title ? (
                <Dialog.Title className="text-xl font-bold text-ink">
                  {title}
                </Dialog.Title>
              ) : null}
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-soft">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className="rounded-full p-2 text-ink-soft transition-colors hover:bg-blush-50 hover:text-ink">
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
