"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@odh/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const options = [
  { value: "light", label: "สว่าง", icon: Sun },
  { value: "dark", label: "มืด", icon: Moon },
  { value: "system", label: "ระบบ", icon: Monitor },
] as const;

/**
 * The theme switch, as three segments in the sidebar footer: one click, and
 * you can see which one is on without opening anything.
 *
 * The collapsed rail has no room for three, so it falls back to one button
 * showing the current choice, which steps to the next on click.
 *
 * Nothing renders until mounted: the choice lives in localStorage, so the
 * server-rendered HTML of a static export cannot know which segment is the
 * active one, and showing a guess would flip under the user.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme ?? "system") : undefined;
  const active = options.find((option) => option.value === current) ?? options[2];

  return (
    <>
      <ToggleGroup
        type="single"
        value={current ?? ""}
        onValueChange={(next) => {
          // Radix clears the value when you click the active segment; a theme
          // is never "none", so an empty value keeps what is already set.
          if (next) setTheme(next);
        }}
        variant="outline"
        size="sm"
        aria-label="ธีมของหน้าจอ"
        className={cn(
          "w-full rounded-full bg-muted p-1 group-data-[collapsible=icon]:hidden",
          className,
        )}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className={cn(
              "h-8 flex-1 gap-1.5 rounded-full border-0 bg-transparent px-2 font-display text-xs font-semibold text-muted-foreground shadow-none",
              "data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm",
            )}
          >
            <option.icon className="size-3.5" aria-hidden />
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <button
        type="button"
        onClick={() => {
          const index = options.findIndex((option) => option.value === active.value);
          const next = options[(index + 1) % options.length] ?? options[0];
          setTheme(next.value);
        }}
        aria-label={`ธีม: ${active.label} — กดเพื่อเปลี่ยน`}
        title={`ธีม: ${active.label}`}
        className="hidden size-8 items-center justify-center self-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground group-data-[collapsible=icon]:flex"
      >
        <active.icon className="size-4" aria-hidden />
      </button>
    </>
  );
}
