import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./utils/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-line bg-white/80 p-6 shadow-card backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
