import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import DebugPage from "@/pages/debug-page";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Error fallback UI
const ErrorFallback = ({ error }: { error?: Error }) => (
  <div className="min-h-screen flex items-center justify-center bg-red-50">
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
      <p className="mb-4">The application encountered an unexpected error.</p>
      {error && (
        <pre className="bg-gray-100 p-4 rounded text-sm mb-4 overflow-auto">
          {error.message}
        </pre>
      )}
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

// Protected route implementation
function ProtectedRouteContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    console.log("ProtectedRouteContent checking auth state:", { 
      isAuthenticated: !!user, 
      isLoading 
    });
    
    // If we're not loading and there's no user, redirect to auth page
    if (!isLoading && !user) {
      console.log("Redirecting to /auth from protected route");
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <span className="text-lg text-gray-600">Verifying your credentials...</span>
      </div>
    );
  }
  
  // If we have a user, render the children
  if (user) {
    return <>{children}</>;
  }
  
  // This should never render because the useEffect will redirect
  return null;
}

// Simplified router component
function Router() {
  const [isReady, setIsReady] = useState(false);
  
  // Set ready state after a small delay to ensure auth state is initialized
  useEffect(() => {
    console.log("Router component mounted");
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={<ErrorFallback error={new Error("Navigation system crashed")} />}
      resetOnNavigate={true}
    >
      <Switch>
        {/* Debug page is not protected */}
        <Route path="/debug">
          <DebugPage />
        </Route>
        
        {/* Auth page */}
        <Route path="/auth">
          <ErrorBoundary>
            <AuthPage />
          </ErrorBoundary>
        </Route>
        
        {/* Protected routes */}
        <Route path="/">
          <ProtectedRouteContent>
            <ErrorBoundary>
              <Home />
            </ErrorBoundary>
          </ProtectedRouteContent>
        </Route>
        
        <Route path="/profile">
          <ProtectedRouteContent>
            <ErrorBoundary>
              <ProfilePage />
            </ErrorBoundary>
          </ProtectedRouteContent>
        </Route>
        
        {/* Not found route */}
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  useEffect(() => {
    console.log("App component mounted");
  }, []);
  
  return (
    <ErrorBoundary
      fallback={<ErrorFallback error={new Error("App crashed at root level")} />}
      resetOnNavigate={true}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
