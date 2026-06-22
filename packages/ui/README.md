# @odh/ui

Shared React components for the Owl Day House site. Styling references
[`@odh/brand`](../brand) tokens and the Tailwind v4 theme — **no hardcoded hex**.

## Prerequisite

The consuming app must load the brand theme once (e.g. `apps/web/app/globals.css`):

```css
@import "tailwindcss";
@import "@odh/brand/theme.css";
@source "../../packages/ui/src"; /* let Tailwind scan component classes */
```

## Usage

```tsx
import { OwlMark, Button, Card, Badge, SectionHeading } from "@odh/ui";

export default function Example() {
  return (
    <Card>
      <Badge variant="gold">NEW</Badge>
      <SectionHeading
        eyebrow="Talon"
        title="เว็บไซต์ไวด้วย AI"
        subtitle="เริ่มต้น ฿3,900 — เสร็จใน 5 วัน"
      />
      <div className="flex gap-3">
        <Button variant="gold">เริ่มเลย ฿3,900</Button>
        {/* asChild renders the link instead of a <button> */}
        <Button variant="ghost" asChild>
          <a href="https://m.me/owldayhouse">ทักเราเลย</a>
        </Button>
      </div>
      <OwlMark size={48} />
    </Card>
  );
}
```

## Components

| Component        | Notes                                                              |
| ---------------- | ------------------------------------------------------------------ |
| `OwlMark`        | Registered owl symbol (SVG). Prop: `size`. Inherits `currentColor`. |
| `OwlLogo`        | Registered horizontal lockup (owl + wordmark). Prop: `height`. `currentColor`. |
| `Button`         | `variant`: `gold` \| `navy` \| `ghost`; `size`: `sm` \| `md` \| `lg`; `asChild`. |
| `Card`           | Surface container (border + soft shadow).                          |
| `Badge`          | `variant`: `gold` \| `navy` \| `soft`.                             |
| `SectionHeading` | `eyebrow` + `title` + `subtitle`, `align`, `as` (h1–h3).           |
| `Showcase`       | Renders every component together — quick visual story.             |

All components are typed, `forwardRef`-enabled, and accept `className`.
