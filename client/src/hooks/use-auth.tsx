import { createContext, ReactNode, useContext, useState, useEffect } from "react";
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
  authInitialized: boolean;
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // We'll use this to track if the auth query has completed at least once
  const [authQueryCompleted, setAuthQueryCompleted] = useState(false);
  
  console.log("AuthProvider rendering, authInitialized:", authInitialized);
  
  const {
    data: user,
    error,
    isLoading,
    isSuccess,
    isError,
  } = useQuery<SafeUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Track when the query completes (success or error)
  useEffect(() => {
    if (!authQueryCompleted && (isSuccess || isError)) {
      console.log("Auth query completed with status - success:", isSuccess, "error:", isError);
      setAuthQueryCompleted(true);
      
      // After a small delay, mark auth as initialized
      // This gives time for other components to react to the auth state
      setTimeout(() => {
        console.log("Setting authInitialized to true");
        setAuthInitialized(true);
      }, 100);
    }
  }, [isSuccess, isError, authQueryCompleted]);

  const loginMutation = useMutation<SafeUser, Error, LoginData>({
    mutationFn: async (credentials) => {
      try {
        console.log("Login mutation starting for user:", credentials.username);
        const res = await apiRequest("POST", "/api/login", credentials);
        const userData = await res.json();
        console.log("Login mutation successful, received user data:", userData);
        return userData;
      } catch (error) {
        console.error("Login mutation error:", error);
        throw error;
      }
    },
    onSuccess: (user) => {
      try {
        console.log("Login onSuccess callback, updating query cache with user:", user.username);
        queryClient.setQueryData(["/api/user"], user);
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.name || user.username}!`,
        });
      } catch (error) {
        console.error("Error in login mutation onSuccess callback:", error);
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "An unexpected error occurred during login",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<SafeUser, Error, RegisterData>({
    mutationFn: async (userData) => {
      try {
        console.log("Register mutation starting for user:", userData.username);
        const res = await apiRequest("POST", "/api/register", userData);
        const newUser = await res.json();
        console.log("Register mutation successful, received user data:", newUser);
        return newUser;
      } catch (error) {
        console.error("Register mutation error:", error);
        throw error;
      }
    },
    onSuccess: (user) => {
      try {
        console.log("Register onSuccess callback, updating query cache with user:", user.username);
        queryClient.setQueryData(["/api/user"], user);
        toast({
          title: "Registration successful",
          description: `Welcome, ${user.name || user.username}!`,
        });
      } catch (error) {
        console.error("Error in register mutation onSuccess callback:", error);
      }
    },
    onError: (error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred during registration",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        console.log("Logout mutation starting");
        await apiRequest("POST", "/api/logout");
        console.log("Logout mutation successful");
      } catch (error) {
        console.error("Logout mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      try {
        console.log("Logout onSuccess callback, clearing user data from cache");
        queryClient.setQueryData(["/api/user"], null);
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      } catch (error) {
        console.error("Error in logout mutation onSuccess callback:", error);
      }
    },
    onError: (error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message || "An unexpected error occurred during logout",
        variant: "destructive",
      });
    },
  });

  // Safeguard - if we're in an error state, log the error
  if (error) {
    console.error("Auth provider error:", error);
  }

  // Safety check - make sure the user object is properly shaped if it exists
  const safeUser = user ? (
    typeof user === 'object' && user !== null ? user : null
  ) : null;

  if (safeUser) {
    console.log("Auth provider has user:", safeUser.username);
  } else if (!isLoading) {
    console.log("Auth provider has no user and is not loading");
  }

  return (
    <AuthContext.Provider
      value={{
        user: safeUser,
        isLoading,
        error,
        authInitialized,
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
  try {
    const context = useContext(AuthContext);
    if (!context) {
      console.error("useAuth hook called outside of AuthProvider");
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
  } catch (error) {
    console.error("Error in useAuth hook:", error);
    // Re-throw the error to propagate it up
    throw error;
  }
}