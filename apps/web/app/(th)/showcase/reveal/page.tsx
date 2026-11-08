import type { Metadata } from "next";
import { RevealHero } from "@/components/RevealHero";

// Interactive demo kept for direct links; it is not part of the main site.
export const metadata: Metadata = {
  title: "โชว์เคส Interactive",
  robots: { index: false, follow: true },
};

export default function ShowcaseRevealPage() {
  return (
    <main>
      <RevealHero />
    </main>
  );
}
