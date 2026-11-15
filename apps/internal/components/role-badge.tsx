import { ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@odh/ui";
import type { Role } from "@/lib/types";

/**
 * What the signed-in account is allowed to do, said once and the same way
 * everywhere. An admin is filled navy — this account can change other
 * people's data; sales is a quiet outline.
 */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const admin = role === "admin";
  const Icon = admin ? ShieldCheck : UserRound;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        admin
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {admin ? "ผู้ดูแล" : "เซลส์"}
    </span>
  );
}
