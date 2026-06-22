import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./utils/cn";

export interface SectionHeadingProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  /** Heading level for the title (one <h1> per page). */
  as?: "h1" | "h2" | "h3";
}

export const SectionHeading = forwardRef<HTMLDivElement, SectionHeadingProps>(
  ({ eyebrow, title, subtitle, align = "left", as = "h2", className, ...props }, ref) => {
    const Heading = as;
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-3",
          align === "center" && "items-center text-center",
          className,
        )}
        {...props}
      >
        {eyebrow ? (
          <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            {eyebrow}
          </span>
        ) : null}
        <Heading className="font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">
          {title}
        </Heading>
        {subtitle ? (
          <p className={cn("max-w-2xl text-base text-muted", align === "center" && "mx-auto")}>
            {subtitle}
          </p>
        ) : null}
      </div>
    );
  },
);
SectionHeading.displayName = "SectionHeading";
