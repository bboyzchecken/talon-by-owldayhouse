import { forwardRef, type SVGProps } from "react";
import { colors } from "@odh/brand";

export interface OwlMarkProps extends SVGProps<SVGSVGElement> {
  /** Rendered width/height in px. */
  size?: number;
  /** Draw the rounded gold tile behind the owl (logo lockup). */
  tile?: boolean;
}

/**
 * ODH owl mark — a geometric navy owl on a gold tile.
 * Colors come from @odh/brand tokens (no hardcoded hex here).
 */
export const OwlMark = forwardRef<SVGSVGElement, OwlMarkProps>(
  ({ size = 40, tile = true, className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Owl Day House"
      className={className}
      {...props}
    >
      {tile ? <rect width="48" height="48" rx="12" fill={colors.gold} /> : null}
      {/* ear tufts */}
      <path d="M15 11l4.4 6.4-7.8.2z" fill={colors.navy} />
      <path d="M33 11l-4.4 6.4 7.8.2z" fill={colors.navy} />
      {/* head + body */}
      <path
        d="M24 12c7.7 0 13 5.6 13 13.5C37 33.4 31.2 39 24 39s-13-5.6-13-13.5C11 17.6 16.3 12 24 12z"
        fill={colors.navy}
      />
      {/* eyes */}
      <circle cx="19" cy="24.5" r="6" fill={colors.paper} />
      <circle cx="29" cy="24.5" r="6" fill={colors.paper} />
      <circle cx="19" cy="24.5" r="2.6" fill={colors.navy} />
      <circle cx="29" cy="24.5" r="2.6" fill={colors.navy} />
      {/* beak */}
      <path d="M24 31l2.8-3.4h-5.6z" fill={colors.gold} />
    </svg>
  ),
);
OwlMark.displayName = "OwlMark";
