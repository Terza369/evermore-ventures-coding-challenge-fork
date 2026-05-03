import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Disable refetch on window focus
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },

  queryCache: new QueryCache({
    onError: (error) => {
      console.error(error.message ? error.message : "An error occurred");
    },
  }),

  mutationCache: new MutationCache({
    onError: (error) => {
      console.error(error.message ? error.message : "An error occurred");
    },
  }),
});
