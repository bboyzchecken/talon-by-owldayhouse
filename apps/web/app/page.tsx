import { Hero } from "@/components/Hero";
import { ValueLadder } from "@/components/ValueLadder";
import { WhyUs } from "@/components/WhyUs";
import { TalonLaunch } from "@/components/TalonLaunch";
import { TrustStrip } from "@/components/TrustStrip";
import { ClosingCTA } from "@/components/ClosingCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueLadder />
      <WhyUs />
      <TalonLaunch />
      <TrustStrip />
      <ClosingCTA />
    </>
  );
}
