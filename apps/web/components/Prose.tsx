import type { ReactNode } from "react";
import { cn } from "@odh/ui";

// Article typography for /news bodies. Styles plain semantic children
// (h2/h3/p/ul/ol/a/strong/blockquote) via Tailwind descendant variants — no
// @tailwindcss/typography dependency, all colors from brand tokens.
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "font-body text-base text-ink",
        "[&_p]:my-4 [&_p]:leading-8 [&_p]:text-muted",
        "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-navy",
        "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-navy",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-muted",
        "[&_li]:my-1.5 [&_li]:leading-7",
        "[&_a]:font-medium [&_a]:text-navy [&_a]:underline [&_a]:decoration-gold [&_a]:decoration-2 [&_a]:underline-offset-4 hover:[&_a]:text-gold",
        "[&_strong]:font-semibold [&_strong]:text-navy",
        "[&_blockquote]:my-6 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-gold [&_blockquote]:bg-gold-soft/50 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-navy",
        className,
      )}
    >
      {children}
    </div>
  );
}
