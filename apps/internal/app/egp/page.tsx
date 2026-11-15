"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/odh";

export default function EgpIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/egp/radar");
  }, [router]);
  return <Spinner />;
}
