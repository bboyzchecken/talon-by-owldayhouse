import { QueryClient } from "@tanstack/react-query";

/** Factory so each app/runtime gets its own QueryClient (avoids shared state). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
