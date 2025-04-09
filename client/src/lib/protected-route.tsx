import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertTriangle } from "lucide-react";
import { Route, Redirect } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  return (
    <ErrorBoundary>
      <ProtectedRouteContent path={path} component={Component} />
    </ErrorBoundary>
  );
}

function ProtectedRouteContent({ path, component: Component }: ProtectedRouteProps) {
  try {
    const { user, isLoading, authInitialized } = useAuth();
    console.log(`Protected route at ${path} - User:`, user ? user.username : "not logged in", "isLoading:", isLoading, "authInitialized:", authInitialized);

    return (
      <Route path={path}>
        {() => {
          try {
            // Show a spinner while auth is loading or not fully initialized
            if (isLoading || !authInitialized) {
              return (
                <div className="flex flex-col items-center justify-center min-h-screen">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                  <p className="text-gray-600">
                    {isLoading ? "Checking authentication..." : "Initializing application..."}
                  </p>
                </div>
              );
            }

            // If not authenticated and auth has initialized, redirect to login
            if (!user) {
              console.log(`Redirecting to /auth from ${path} - no authenticated user`);
              return <Redirect to="/auth" />;
            }

            // User is authenticated, render the protected component
            console.log(`Rendering protected component at ${path} for user:`, user.username);
            
            // Wrap the component in another error boundary for extra protection
            return (
              <ErrorBoundary>
                <Component />
              </ErrorBoundary>
            );
          } catch (error) {
            console.error("Error in ProtectedRoute render function:", error);
            return <ProtectedRouteErrorFallback />;
          }
        }}
      </Route>
    );
  } catch (error) {
    console.error("Error in ProtectedRouteContent component:", error);
    return (
      <Route path={path}>
        {() => <ProtectedRouteErrorFallback />}
      </Route>
    );
  }
}

// Extract error UI to a separate component for reuse
function ProtectedRouteErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Authentication Error</h2>
        <p className="text-gray-600 mb-6 text-center">
          There was a problem with authentication. This could be due to a session timeout or server issue.
        </p>
        <div className="flex flex-col space-y-3">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
          <button 
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 w-full"
            onClick={() => window.location.href = "/auth"}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}