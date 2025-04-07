import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

// Error fallback component for protected routes
const ProtectedRouteErrorFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
    <h1 className="text-2xl font-bold text-red-600 mb-4">Protected Page Error</h1>
    <p className="text-gray-800 mb-4">There was an error rendering this protected page.</p>
    <button 
      onClick={() => window.location.reload()} 
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4"
    >
      Refresh Page
    </button>
    <button 
      onClick={() => window.location.href = '/auth'} 
      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
    >
      Go to Login Page
    </button>
  </div>
);

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading, error } = useAuth();
  
  // Debug information with enhanced logging
  console.log('ProtectedRoute rendering:', {
    path,
    isAuthenticated: !!user,
    isLoading,
    hasError: !!error,
    userData: user,
    errorMessage: error?.message
  });

  return (
    <Route path={path}>
      {() => {
        // Check for auth state inside the route render function to ensure latest state
        console.log('Route render function executing for:', path, {
          isAuthenticated: !!user,
          isLoading,
          hasError: !!error
        });
        
        // Case 1: Still loading auth state - show loading spinner
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <span className="text-lg text-gray-600">Verifying your credentials...</span>
            </div>
          );
        }
        
        // Case 2: Error in auth process - show error with debug info
        if (error) {
          console.error('Auth error in protected route:', error);
          return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
              <p className="text-gray-800 mb-4">There was a problem verifying your login status.</p>
              <div className="bg-white p-4 rounded shadow mb-4 w-full max-w-lg">
                <pre className="text-red-500 text-sm overflow-auto">{error.message}</pre>
              </div>
              <button 
                onClick={() => window.location.href = '/auth'} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Return to Login
              </button>
            </div>
          );
        }
        
        // Case 3: Not authenticated - redirect to auth page
        if (!user) {
          console.log('User not authenticated, redirecting to /auth');
          return <Redirect to="/auth" />;
        }
        
        // Case 4: User is authenticated - render protected component
        console.log('User authenticated, rendering protected component');
        
        return (
          <ErrorBoundary fallback={<ProtectedRouteErrorFallback />}>
            <Component />
          </ErrorBoundary>
        );
      }}
    </Route>
  );
}