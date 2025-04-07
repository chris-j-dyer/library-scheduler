import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // Debug information
  console.log('ProtectedRoute rendering for path:', path);
  console.log('User state:', user ? `Logged in as ${user.username}` : 'Not logged in');
  console.log('Loading state:', isLoading);

  return (
    <Route path={path}>
      {() => {
        // Inside the Route render function, the values could have changed
        console.log('Inside Route render for path:', path);
        console.log('User state inside Route:', user ? `Logged in as ${user.username}` : 'Not logged in');
        console.log('Loading state inside Route:', isLoading);
        
        try {
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
          return <Component />;
        } catch (error) {
          console.error('Error in ProtectedRoute render function:', error);
          return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Component Error</h1>
              <p className="text-gray-800 mb-4">There was an error rendering this page.</p>
              <pre className="bg-white p-4 rounded shadow mb-4 overflow-auto max-w-2xl">
                {error instanceof Error ? error.message : 'Unknown error'}
              </pre>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          );
        }
      }}
    </Route>
  );
}