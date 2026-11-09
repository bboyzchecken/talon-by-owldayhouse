import type { ReactNode } from "react";
import { cn } from "@odh/ui";

// Article typography for /news bodies. Styles plain semantic children via
// Tailwind descendant variants, with all colors from brand tokens.
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "font-body text-base text-ink",
        "[&_p]:my-4 [&_p]:leading-8 [&_p]:text-muted",
        "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:leading-snug [&_h2]:font-semibold [&_h2]:text-ink",
        "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-muted",
        "[&_li]:my-1.5 [&_li]:leading-7",
        "[&_a]:font-medium [&_a]:text-navy [&_a]:underline [&_a]:underline-offset-4",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_blockquote]:my-10 [&_blockquote]:font-display [&_blockquote]:text-2xl [&_blockquote]:leading-relaxed [&_blockquote]:text-navy",
        className,
      )}
    >
      {children}
    </div>
  );
}
