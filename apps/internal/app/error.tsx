"use client";

import { OwlLogo } from "@odh/ui";
import { ErrorView } from "@/components/error-view";

// The last boundary: the shell itself failed, or a page that draws its own, so
// there is no sidebar left to sit in.
export default function AppError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <OwlLogo className="mb-8 h-9 w-auto" />
      <ErrorView {...props} />
    </div>
  );
}
