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
      <SectionHeading eyebrow="Services" title="ทีมเดียว ตั้งแต่ระบบถึงหน้างาน" />
      <div className="flex gap-3">
        <Button variant="key">คุยโปรเจกต์</Button>
        {/* asChild renders the link instead of a <button> */}
        <Button variant="line" asChild>
          <a href="https://m.me/owldayhouse">Messenger</a>
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
| `Button`         | `variant`: `key` \| `line` (site), `gold` \| `navy` \| `ghost` (internal tools); `size`: `sm` \| `md` \| `lg`; `asChild`. |
| `Card`           | Surface container (border + soft shadow).                          |
| `Badge`          | `variant`: `gold` \| `navy` \| `soft`.                             |
| `SectionHeading` | `eyebrow` + `title` + `subtitle`, `align`, `as` (h1–h3).           |
| `Showcase`       | Renders every component together — quick visual story.             |

All components are typed, `forwardRef`-enabled, and accept `className`.
