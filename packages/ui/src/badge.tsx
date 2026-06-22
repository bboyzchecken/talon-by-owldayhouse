import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./utils/cn";

const variantClasses = {
  gold: "bg-gold text-navy",
  navy: "bg-navy text-paper",
  soft: "bg-gold-soft text-navy",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "soft", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";
