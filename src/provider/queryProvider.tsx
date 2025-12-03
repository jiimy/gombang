"use client";

import React from "react";
import { QueryClientProvider, QueryClient, QueryCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { toast, ToastContainer } from "react-toastify";

function QueryProviders({ children }: React.PropsWithChildren) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // refetchOnWindowFocus: true,
        // throwOnError: true,
        // refetchOnReconnect: true,
        // staleTime: 0
      },
      mutations: {
        onError: (error: any) => {
          console.error('Mutation Error:', error);
          alert(`에러 뮤테이션 ${error}`);
          // toast.error(`Query Error: ${error.message}`);
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // 이 부분이 먼저 발생
        console.log('query', query, error);
        // toast.error(`Mutation Error: ${error.message}`);
        // if (query?.meta?.errorMessage) {
        // }
      },
    }),
  });

  return (
    <QueryClientProvider client={client}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default QueryProviders;
