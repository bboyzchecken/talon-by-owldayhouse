"use client";

import { MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { createQueryClient } from "@odh/query";
import { toApiError } from "./api";

/**
 * The app's QueryClient, with one rule for how an action reports itself.
 *
 * Success: a mutation that should say so out loud carries
 * `meta: { success: "บันทึกแล้ว" }` and the toast comes from here, so a call
 * site never wires up a notification by hand.
 *
 * Failure: a mutation with its own `onError` is left alone — those put the
 * message inline, next to the form that caused it, which is the better place
 * for it. Everything else used to fail in silence (skip, star, restore, a
 * delete that the API refused) and now gets a toast.
 */
export function createInternalQueryClient() {
  return createQueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const success = mutation.meta?.success;
        if (typeof success === "string" && success) {
          toast.success(success);
        }
      },
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) return;
        toast.error(toApiError(error).message);
      },
    }),
  });
}
