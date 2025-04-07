import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Define a properly typed query function
function createQueryFn<TData>(options: { on401: UnauthorizedBehavior }): QueryFunction<TData> {
  return async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (options.on401 === "returnNull" && res.status === 401) {
        return null as unknown as TData;
      }

      await throwIfResNotOk(res);
      return await res.json() as TData;
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
  };
}

export const getQueryFn = createQueryFn;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
      gcTime: 3600000, // 1 hour
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
