import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FilterControls from '@/components/FilterControls';
import Instructions from '@/components/Instructions';
import CalendarView from '@/components/CalendarView';
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Create error-safe wrappers for components
const SafeHeader = () => {
  try {
    return <Header />;
  } catch (e) {
    console.error("Error rendering Header:", e);
    return (
      <div className="bg-white shadow-sm py-4 px-6 mb-6">
        <div className="text-xl font-semibold text-blue-600">Charlotte Mecklenburg Library</div>
        <div className="text-sm text-red-500">Error loading header component</div>
      </div>
    );
  }
};

const SafeFilterControls = () => {
  try {
    return <FilterControls />;
  } catch (e) {
    console.error("Error rendering FilterControls:", e);
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-8">
        <div className="text-red-500">Error loading filter controls</div>
      </div>
    );
  }
};

const SafeInstructions = () => {
  try {
    return <Instructions />;
  } catch (e) {
    console.error("Error rendering Instructions:", e);
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-8">
        <div className="text-red-500">Error loading instructions</div>
      </div>
    );
  }
};

const SafeCalendarView = () => {
  try {
    return <CalendarView />;
  } catch (e) {
    console.error("Error rendering CalendarView:", e);
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-8">
        <div className="text-red-500">Error loading calendar view - Please try refreshing the page</div>
      </div>
    );
  }
};

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
    <span>Loading...</span>
  </div>
);

export default function Home() {
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, isLoading } = useAuth();
  
  // Debug logging for component mounting and user data
  useEffect(() => {
    console.log("Home component mounted");
    console.log("User data in Home:", user);
    console.log("Auth loading state in Home:", isLoading);
    
    // Validate user object
    if (user) {
      try {
        console.log("User ID:", user.id);
        console.log("Username:", user.username);
        // Make sure user object has the expected properties
        if (!user.id || !user.username) {
          console.error("User object is missing required properties");
        }
      } catch (err) {
        console.error("Error accessing user properties:", err);
      }
    }
    
    // Set loaded after a short delay to ensure all child components have time to initialize
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 800); // Increased timeout to 800ms
    
    return () => clearTimeout(timer);
  }, [user, isLoading]);
  
  // Error boundary pattern
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Home Page</h1>
        <p className="text-gray-800 mb-4">There was an error rendering the homepage.</p>
        <pre className="bg-white p-4 rounded shadow mb-4 overflow-auto max-w-2xl">
          {error.message}
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
  
  // Initial loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading Home Page...</span>
      </div>
    );
  }
  
  try {
    // Wrap the actual render in a try-catch to catch any errors during rendering
    return (
      <div className="bg-gray-50 text-gray-800 min-h-screen">
        <SafeHeader />
        
        <main className="max-w-screen-xl mx-auto p-4">
          <SafeFilterControls />
          <SafeInstructions />
          <SafeCalendarView />
        </main>
        
        <footer className="bg-white border-t border-gray-100 py-6 mt-16">
          <div className="max-w-screen-xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>© 2025 Charlotte Mecklenburg Library. All rights reserved.</p>
            <p className="mt-2">
              <a href="#" className="text-blue-600 hover:underline mx-2">Privacy Policy</a>
              <a href="#" className="text-blue-600 hover:underline mx-2">Terms of Service</a>
              <a href="#" className="text-blue-600 hover:underline mx-2">Accessibility</a>
              <a href="#" className="text-blue-600 hover:underline mx-2">Contact</a>
            </p>
          </div>
        </footer>
      </div>
    );
  } catch (e) {
    console.error("Error rendering Home component:", e);
    setError(e instanceof Error ? e : new Error('An unknown error occurred'));
    
    // Return a fallback UI
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Rendering Error</h1>
        <p className="text-gray-800 mb-4">Something went wrong when loading the homepage components.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }
}
