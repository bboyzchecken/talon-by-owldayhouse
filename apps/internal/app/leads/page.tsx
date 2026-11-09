"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";

/** /leads is the tool's root; the day starts on the "วันนี้" screen. */
export default function LeadsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/leads/today");
  }, [router]);
  return <Spinner />;
}
