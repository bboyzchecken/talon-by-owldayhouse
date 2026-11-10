import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./utils/cn";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)] disabled:pointer-events-none disabled:opacity-50";

const variantClasses = {
  key: "bg-[var(--key)] text-[color:var(--on-key)] hover:bg-gold hover:text-navy",
  line: "border border-line-control bg-transparent text-ink hover:border-ink",
  // Kept for the internal document tools.
  gold: "bg-gold text-navy hover:bg-gold/90",
  navy: "bg-navy text-paper hover:bg-navy-deep",
  ghost: "border border-line bg-transparent text-navy hover:bg-navy/5",
} as const;

const sizeClasses = {
  sm: "h-10 px-[18px] text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  /** Render as the child element (e.g. an <a>) instead of <button>. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "key", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(base, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
