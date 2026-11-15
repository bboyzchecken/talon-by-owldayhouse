"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@odh/ui";

/**
 * Form and layout primitives for the internal tools, built on the @odh/brand
 * Tailwind theme. No hex anywhere — only the brand's utilities.
 *
 * Controls are at least 44px tall: the sales team uses this on a phone.
 */

const controlClasses =
  "w-full rounded-xl border border-border bg-card px-4 py-3 font-body text-base text-foreground " +
  "placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " +
  "disabled:bg-muted disabled:text-muted-foreground";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1 font-display text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-gold">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block font-body text-xs text-muted-foreground">{hint}</span> : null}
      {error ? (
        <span className="mt-1.5 block font-body text-xs font-semibold text-primary">{error}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={cn(controlClasses, "resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClasses, "appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** `key` fills the tile with navy — use it for the one number that matters. */
  tone?: "plain" | "key";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "key" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
      )}
    >
      <div
        className={cn(
          "font-mono text-[11px] uppercase tracking-wide",
          tone === "key" ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
      {sub ? (
        <div className={cn("mt-1 font-body text-xs", tone === "key" ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function Spinner({ label = "กำลังโหลด…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-navy" aria-hidden />
      <span className="font-body text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-input/60 px-5 py-10 text-center">
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-md font-body text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** An inline error, used for anything the API refused. */
export function Alert({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "stop" }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 font-body text-sm",
        tone === "stop" ? "border-foreground bg-foreground/5 text-foreground" : "border-gold bg-notice text-primary",
      )}
    >
      {children}
    </div>
  );
}

/** A progress bar for KPI against target. */
export function Meter({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", clamped >= 100 ? "bg-gold" : "bg-primary")}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{label}</div> : null}
    </div>
  );
}
