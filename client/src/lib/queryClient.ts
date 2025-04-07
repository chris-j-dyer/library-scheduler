import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${res.status} - ${text} for URL: ${res.url}`);
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making ${method} request to ${url}`, data ? 'with data' : 'without data');
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`${method} response from ${url}:`, {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    });
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request Error for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Define a properly typed query function
function createQueryFn<TData>(options: { on401: UnauthorizedBehavior }): QueryFunction<TData> {
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Query function executing for URL: ${url}, with behavior on 401: ${options.on401}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });
      
      console.log(`Query response for ${url}:`, {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
      });

      if (options.on401 === "returnNull" && res.status === 401) {
        console.log(`Returning null for 401 response at ${url} as configured`);
        return null as unknown as TData;
      }

      await throwIfResNotOk(res);
      
      const data = await res.json();
      console.log(`Successfully parsed JSON data from ${url}:`, data);
      return data as TData;
    } catch (error) {
      console.error(`Query function error for ${url}:`, error);
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
