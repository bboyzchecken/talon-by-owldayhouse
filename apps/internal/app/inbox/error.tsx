"use client";

import { ErrorView } from "@/components/error-view";

// Inside the tool's layout, so the sidebar stays and only the page is replaced.
export default function InboxError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView {...props} />;
}
