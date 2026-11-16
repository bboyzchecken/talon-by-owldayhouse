"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/odh";

export default function DocsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/docs/list");
  }, [router]);
  return <Spinner />;
}
