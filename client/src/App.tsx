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

function Router() {
  return (
    <Switch>
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
}

function App() {
  // Use a try-catch to catch any errors in the main App
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
    // Basic fallback UI if there's a critical error
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="mb-4">Something went wrong while rendering the application.</p>
          <p className="text-sm text-gray-500 mb-4">
            Please try refreshing the page. If the problem persists, contact support.
          </p>
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
}

export default App;
