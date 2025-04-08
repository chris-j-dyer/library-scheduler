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
  const { user, isLoading, error, loginMutation } = useAuth();
  const [retryCount, setRetryCount] = React.useState(0);
  const [networkError, setNetworkError] = React.useState<Error | null>(null);
  
  // Maximum retries for network errors
  const MAX_RETRIES = 3;
  
  // Debug information with enhanced logging
  React.useEffect(() => {
    console.log('ProtectedRoute state updated:', {
      path,
      isAuthenticated: !!user,
      isLoading,
      hasError: !!error,
      retryCount,
      hasNetworkError: !!networkError
    });
    
    // Auto-retry on network errors
    if (networkError && retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        console.log(`Auto-retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setRetryCount(prev => prev + 1);
        setNetworkError(null);
        // Force re-render by changing key
        window.location.reload();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [path, user, isLoading, error, networkError, retryCount]);
  
  // Safe error handler to prevent unhandled errors
  const handleComponentError = React.useCallback((err: Error) => {
    console.error('Protected route component error:', err);
    
    // Check if it's a network error
    if (err.message.includes('fetch') || 
        err.message.includes('network') || 
        err.message.includes('503')) {
      setNetworkError(err);
    }
  }, []);

  return (
    <Route path={path}>
      {() => {
        // Check for auth state inside the route render function to ensure latest state
        console.log('Route render function executing for:', path, {
          isAuthenticated: !!user,
          isLoading,
          hasError: !!error || !!networkError
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
        
        // Case 2: Network error with retry option
        if (networkError) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50 p-4">
              <h1 className="text-2xl font-bold text-amber-600 mb-4">Connection Issue</h1>
              <p className="text-gray-800 mb-4">We're having trouble connecting to the server.</p>
              <div className="bg-white p-4 rounded shadow mb-4 w-full max-w-lg">
                <p className="text-amber-600 font-medium">Error: {networkError.message}</p>
                <p className="text-gray-500 text-sm mt-2">Retry attempt: {retryCount}/{MAX_RETRIES}</p>
              </div>
              
              {retryCount < MAX_RETRIES ? (
                <p className="text-gray-700 mb-4 animate-pulse">
                  Retrying automatically in a moment...
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => window.location.href = '/auth'} 
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Go to Login Page
                  </button>
                </div>
              )}
            </div>
          );
        }
        
        // Case 3: Auth error - show error with debug info
        if (error) {
          console.error('Auth error in protected route:', error);
          
          // Special handling for common auth errors
          const is401Error = error.message.includes('401') || error.message.includes('Unauthorized');
          const isServiceError = error.message.includes('503') || error.message.includes('Service Unavailable');
          
          if (isServiceError) {
            return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50 p-4">
                <h1 className="text-2xl font-bold text-amber-600 mb-4">Service Temporarily Unavailable</h1>
                <p className="text-gray-800 mb-4">The authentication service is currently unavailable. Please try again in a moment.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 mb-4"
                >
                  Retry
                </button>
                <button 
                  onClick={() => window.location.href = '/auth'} 
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Go to Login Page
                </button>
              </div>
            );
          }
          
          if (is401Error) {
            console.log('User unauthorized (401), redirecting to /auth');
            return <Redirect to="/auth" />;
          }
          
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
        
        // Case 4: Not authenticated - redirect to auth page
        if (!user) {
          console.log('User not authenticated, redirecting to /auth');
          return <Redirect to="/auth" />;
        }
        
        // Case 5: User is authenticated - render protected component
        console.log('User authenticated, rendering protected component');
        
        return (
          <ErrorBoundary 
            fallback={<ProtectedRouteErrorFallback />}
            onError={handleComponentError}
          >
            <Component />
          </ErrorBoundary>
        );
      }}
    </Route>
  );
}