import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertTriangle } from "lucide-react";
import { Route, Redirect } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  try {
    const { user, isLoading } = useAuth();
    console.log(`Protected route at ${path} - User:`, user ? user.username : "not logged in", "isLoading:", isLoading);

    return (
      <Route path={path}>
        {() => {
          try {
            if (isLoading) {
              return (
                <div className="flex items-center justify-center min-h-screen">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              );
            }

            if (!user) {
              console.log(`Redirecting to /auth from ${path} - no authenticated user`);
              return <Redirect to="/auth" />;
            }

            console.log(`Rendering protected component at ${path} for user:`, user.username);
            return <Component />;
          } catch (error) {
            console.error("Error in ProtectedRoute render function:", error);
            return (
              <div className="flex flex-col items-center justify-center min-h-screen">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Page</h2>
                <p className="text-gray-700 mb-4 text-center max-w-md">
                  There was a problem loading this page. Please try refreshing your browser.
                </p>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </button>
              </div>
            );
          }
        }}
      </Route>
    );
  } catch (error) {
    console.error("Error in ProtectedRoute component:", error);
    return (
      <Route path={path}>
        {() => (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Page</h2>
            <p className="text-gray-700 mb-4 text-center max-w-md">
              There was a problem loading this page. Please try refreshing your browser.
            </p>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        )}
      </Route>
    );
  }
}