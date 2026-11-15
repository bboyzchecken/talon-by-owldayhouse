import { AlertOctagon } from "lucide-react";
import { cn } from "@odh/ui";
import { ownerTypeLabels, stageLabels } from "@/lib/labels";
import type { OwnerType, Stage } from "@/lib/types";

/**
 * Badges stay inside the brand palette (navy, gold, ink, line) — no new colours.
 * Gold is reserved for `won`, which is the one point worth celebrating on a
 * screen; do_not_pitch uses solid ink, because it has to read as a hard stop.
 */

const stageClasses: Record<Stage, string> = {
  new: "border border-border text-muted-foreground",
  contacted: "border border-border text-foreground",
  meeting: "border border-primary/30 text-primary",
  proposal: "bg-primary/10 text-primary",
  won: "bg-gold text-navy",
  lost: "bg-foreground/5 text-muted-foreground",
  nurture: "border border-dashed border-input text-muted-foreground",
  declined: "bg-foreground/5 text-muted-foreground line-through decoration-muted-foreground/60",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 font-display text-xs font-semibold",
        stageClasses[stage] ?? stageClasses.new,
        className,
      )}
    >
      {stageLabels[stage] ?? stage}
    </span>
  );
}

export function OwnerTypeBadge({
  ownerType,
  ownerName,
  className,
}: {
  ownerType: OwnerType;
  ownerName?: string;
  className?: string;
}) {
  const isCompany = ownerType === "company";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-xs font-semibold",
        isCompany ? "bg-primary text-primary-foreground" : "border border-primary/40 text-primary",
        className,
      )}
      title={isCompany ? "ลูกค้าที่บริษัทหามา — นับเป็น KPI หลัก" : "ลูกค้าเดิมของเซลส์ — นับเป็นโบนัส"}
    >
      {ownerTypeLabels[ownerType] ?? ownerType}
      {ownerName ? <span className="font-normal opacity-80">· {ownerName}</span> : null}
    </span>
  );
}

/** The do_not_pitch warning. It appears on every screen that shows the lead. */
export function DoNotPitchBadge({ reason, className }: { reason?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 font-display text-xs font-semibold text-background",
        className,
      )}
      title={reason || "ห้ามเสนอขายตรง"}
    >
      <AlertOctagon className="size-3.5" aria-hidden />
      ห้ามเสนอขายตรง
    </span>
  );
}
