import { cn } from "@/lib/utils";

const base =
  "w-full rounded-2xl border border-blush-200 bg-blush-50/50 px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-blush-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blush-200";

export function Input({ className, ...props }) {
  return <input className={cn(base, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return (
    <textarea className={cn(base, "resize-none", className)} {...props} />
  );
}

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-semibold text-ink", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
      {children}
    </p>
  );
}
