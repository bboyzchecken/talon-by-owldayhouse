import { Hero } from "@/components/Hero";
import { ValueLadder } from "@/components/ValueLadder";
import { TalonLaunch } from "@/components/TalonLaunch";
import { TrustStrip } from "@/components/TrustStrip";
import { ClosingCTA } from "@/components/ClosingCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueLadder />
      <TalonLaunch />
      <TrustStrip />
      <ClosingCTA />
    </>
  );
}
