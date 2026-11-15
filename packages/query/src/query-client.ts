import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

/**
 * Factory so each app/runtime gets its own QueryClient (avoids shared state).
 *
 * `config` is merged over the defaults, which is how an app attaches its own
 * caches — a MutationCache that turns every failed action into a toast, say —
 * without restating the query defaults.
 */
export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        ...config.defaultOptions?.queries,
      },
    },
  });
}
