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
import { useState, useEffect } from "react";

// A simple router component with basic error handling
function Router() {
  const [routerError, setRouterError] = useState<Error | null>(null);
  
  // Log when Router component mounts
  useEffect(() => {
    console.log("Router component mounted");
  }, []);
  
  if (routerError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Navigation Error</h1>
          <p className="mb-4">Something went wrong with the routing.</p>
          <pre className="bg-gray-100 p-4 rounded text-sm mb-4 overflow-auto">
            {routerError.message}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  try {
    return (
      <Switch>
        {/* Debug page is not protected so we can use it to verify the app is working */}
        <Route path="/debug">
          <DebugPage />
        </Route>
        <Route path="/auth">
          <AuthPage />
        </Route>
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route>
          <NotFound />
        </Route>
      </Switch>
    );
  } catch (error) {
    console.error("Router rendering error:", error);
    setRouterError(error instanceof Error ? error : new Error('Unknown router error'));
    return null; // Return null temporarily while we set the error state
  }
}

function App() {
  const [appError, setAppError] = useState<Error | null>(null);
  
  // Log when App component mounts
  useEffect(() => {
    console.log("App component mounted");
  }, []);
  
  if (appError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="mb-4">Something went wrong while rendering the application.</p>
          <pre className="bg-gray-100 p-4 rounded text-sm mb-4 overflow-auto">
            {appError.message}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Fatal App rendering error:", error);
    setAppError(error instanceof Error ? error : new Error('Unknown application error'));
    return null; // Return null temporarily while we set the error state
  }
}

export default App;
