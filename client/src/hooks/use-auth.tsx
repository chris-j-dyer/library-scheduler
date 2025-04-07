import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, insertUserSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Create a schema for login data - just username and password
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

type LoginData = z.infer<typeof loginSchema>;

// Create a schema for registration data - more fields
const registerSchema = insertUserSchema
  .pick({
    username: true,
    password: true,
    name: true,
    email: true,
  })
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterData = Omit<z.infer<typeof registerSchema>, "confirmPassword">;

// Define the type for a user without the password
type SafeUser = Omit<User, "password">;

type AuthContextType = {
  user: SafeUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,  // Retry once in case of network issues
    staleTime: 1000 * 60, // Data is fresh for 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  const loginMutation = useMutation<SafeUser, Error, LoginData>({
    mutationFn: async (credentials) => {
      console.log("Login mutation executing with credentials:", { username: credentials.username });
      
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        
        if (!res.ok) {
          console.error("Login API returned error status:", res.status);
          if (res.status === 401) {
            throw new Error("Invalid username or password");
          } else {
            throw new Error(`Login request failed with status: ${res.status}`);
          }
        }
        
        // Parse the response JSON
        let data;
        try {
          data = await res.json();
        } catch (jsonError) {
          console.error("Failed to parse login response as JSON:", jsonError);
          throw new Error("Server returned invalid data format");
        }
        
        console.log("Login response data:", data);
        
        // Validate the user object
        if (!data || typeof data !== 'object') {
          throw new Error("Invalid response format from login endpoint");
        }
        
        if (!data.id || !data.username) {
          console.error("Missing required user properties in login response:", data);
          throw new Error("Missing required user properties in response");
        }
        
        return data;
      } catch (err) {
        console.error("Error in login mutation:", err);
        throw err;
      }
    },
    onSuccess: (user) => {
      console.log("Login successful, user data:", user);
      
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Show success toast
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name || user.username}!`,
      });
      
      // Force a refetch of user data to ensure it's correct and reset any stale state
      setTimeout(() => {
        console.log("Invalidating user query after successful login");
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        // Also force a refetch of user reservations
        queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      }, 100);
    },
    onError: (error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<SafeUser, Error, RegisterData>({
    mutationFn: async (userData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name || user.username}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cast the user data to SafeUser | null since we know the schema
  const safeUser = user as SafeUser | null;
  
  // Add some debug logging
  console.log("Auth provider state:", { 
    hasUser: !!safeUser, 
    isLoading, 
    hasError: !!error,
    userData: safeUser 
  });

  return (
    <AuthContext.Provider
      value={{
        user: safeUser,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}