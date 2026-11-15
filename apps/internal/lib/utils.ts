/**
 * The helper every shadcn component imports as `@/lib/utils`.
 *
 * It re-exports the monorepo's own `cn` so a component pasted from the shadcn
 * registry needs no edit, and so the internal tools and the marketing site
 * merge classes through exactly one implementation.
 */
export { cn } from "@odh/ui";
