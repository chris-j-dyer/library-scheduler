import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import PaymentPage from "@/pages/payment-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

function Router() {
  console.log("Router component rendering");
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/payment/:reservationId" component={PaymentPage} />
      <Route path="/auth">
        <ErrorBoundary>
          <AuthPage />
        </ErrorBoundary>
      </Route>
      <Route>
        <ErrorBoundary>
          <NotFound />
        </ErrorBoundary>
      </Route>
    </Switch>
  );
}

// Main error fallback component for the entire application
function AppErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  console.error("Application-level error:", error);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Application Error</h2>
        <p className="text-gray-600 mb-4 text-center">
          The application encountered an unexpected error. We apologize for the inconvenience.
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded mb-6 overflow-auto max-h-32">
          {error.message}
        </div>
        <div className="flex justify-center space-x-3">
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Reload Application
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/auth"}
            className="border-blue-600 text-blue-600"
          >
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}

function App() {
  console.log("App component rendering");
  return (
    <ErrorBoundary
      fallback={AppErrorFallback}
      onError={(error, info) => {
        console.error("Root error boundary caught an error:", error);
        console.error("Component stack:", info.componentStack);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
