import { cn } from "@odh/ui";
import { docStatusLabels } from "@/lib/docs";
import type { DocStatus } from "@/lib/types";

/** Draft is outlined, issued is the solid key colour, voided is struck through. */
export function DocStatusBadge({ status }: { status: DocStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 font-display text-xs font-semibold",
        status === "issued" && "bg-primary text-primary-foreground",
        status === "draft" && "border border-border text-muted-foreground",
        status === "voided" && "bg-muted text-muted-foreground line-through",
      )}
    >
      {docStatusLabels[status]}
    </span>
  );
}
