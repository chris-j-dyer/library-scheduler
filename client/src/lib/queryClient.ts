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
    
    // Add retry mechanism for transient errors
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    while (retries <= maxRetries) {
      try {
        const res = await fetch(url, {
          credentials: "include",
          // Add cache busting parameter to avoid stale responses
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        
        console.log(`Query response for ${url}:`, {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          attempt: retries + 1
        });

        // Handle special status codes
        if (options.on401 === "returnNull" && res.status === 401) {
          console.log(`Returning null for 401 response at ${url} as configured`);
          return null as unknown as TData;
        }
        
        // Handle service unavailable specifically
        if (res.status === 503) {
          if (retries < maxRetries) {
            console.log(`Service unavailable (503) for ${url}, retrying in ${retryDelay}ms (attempt ${retries + 1}/${maxRetries})`);
            retries++;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue; // Retry the request
          } else {
            console.error(`Service unavailable (503) for ${url} after ${maxRetries} retries`);
            // For auth endpoints, return null when service is unavailable to prevent blocking the UI
            if (url === '/api/user' && options.on401 === "returnNull") {
              console.warn(`Returning null for ${url} after service unavailable to prevent blocking`);
              return null as unknown as TData;
            }
          }
        }

        // For other errors, throw
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        
        try {
          const data = await res.json();
          console.log(`Successfully parsed JSON data from ${url}`);
          return data as TData;
        } catch (jsonError) {
          console.error(`Failed to parse JSON from ${url}:`, jsonError);
          throw new Error(`Invalid JSON response from server: ${jsonError}`);
        }
      } catch (error) {
        console.error(`Query function error for ${url}:`, error);
        
        // Only retry on network errors or 503s, which we handle above
        if (error instanceof TypeError && error.message.includes('fetch') && retries < maxRetries) {
          console.log(`Network error for ${url}, retrying in ${retryDelay}ms (attempt ${retries + 1}/${maxRetries})`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw error;
        }
      }
    }
    
    // This should never be reached due to the throw in the catch block
    throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
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
