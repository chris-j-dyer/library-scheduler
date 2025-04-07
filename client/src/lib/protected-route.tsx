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

// A simple wrapper for the component being rendered
const ComponentWrapper = ({ Component }: { Component: React.ComponentType<any> }) => {
  try {
    return <Component />;
  } catch (error) {
    console.error("Error in ComponentWrapper:", error);
    throw error; // Let the error boundary handle it
  }
};

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // Debug information
  console.log('ProtectedRoute rendering for path:', path);
  console.log('User state:', user ? `Logged in as ${user.username}` : 'Not logged in');
  console.log('Loading state:', isLoading);

  return (
    <Route path={path}>
      {() => {
        console.log('Inside Route render for path:', path);
        console.log('User state inside Route:', user ? `Logged in as ${user.username}` : 'Not logged in');
        console.log('Loading state inside Route:', isLoading);
        
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading user data...</span>
            </div>
          );
        }

        if (!user) {
          console.log('Redirecting to /auth because user is not authenticated');
          return <Redirect to="/auth" />;
        }

        console.log('Rendering component for authenticated user');
        
        return (
          <ErrorBoundary fallback={<ProtectedRouteErrorFallback />}>
            <ComponentWrapper Component={Component} />
          </ErrorBoundary>
        );
      }}
    </Route>
  );
}