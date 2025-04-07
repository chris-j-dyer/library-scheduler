import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import DebugPage from "@/pages/debug-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

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

// Simple router component 
function Router() {
  // Log when Router component mounts
  useEffect(() => {
    console.log("Router component mounted");
  }, []);

  return (
    <ErrorBoundary
      fallback={<ErrorFallback error={new Error("Navigation system crashed")} />}
    >
      <Switch>
        {/* Debug page is not protected so we can use it to verify the app is working */}
        <Route path="/debug">
          <DebugPage />
        </Route>
        <Route path="/auth">
          <ErrorBoundary>
            <AuthPage />
          </ErrorBoundary>
        </Route>
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  // Log when App component mounts
  useEffect(() => {
    console.log("App component mounted");
  }, []);
  
  return (
    <ErrorBoundary
      fallback={<ErrorFallback error={new Error("App crashed at root level")} />}
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
