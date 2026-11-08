import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { ValueLadder } from "@/components/ValueLadder";
import { WhyUs } from "@/components/WhyUs";
import { TalonLaunch } from "@/components/TalonLaunch";
import { TrustStrip } from "@/components/TrustStrip";
import { ClosingCTA } from "@/components/ClosingCTA";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ValueLadder />
      <WhyUs />
      <TalonLaunch />
      <TrustStrip />
      <ClosingCTA />
    </main>
  );
}
