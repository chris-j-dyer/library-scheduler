import { useState } from 'react';
import Header from '@/components/Header';
import FilterControls from '@/components/FilterControls';
import Instructions from '@/components/Instructions';
import CalendarView from '@/components/CalendarView';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  // Add error boundary to catch and display any errors
  try {
    const { user } = useAuth();
    console.log("Home component rendering with user:", user ? user.username : "not logged in");
    
    return (
      <div className="bg-gray-50 text-gray-800 min-h-screen">
        <Header />
        <main className="max-w-screen-xl mx-auto p-4">
          <FilterControls />
          <Instructions />
          <CalendarView />
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
  } catch (error) {
    console.error("Error rendering Home component:", error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-700 mb-4">
            We encountered an error while loading the page. Please try refreshing or contact support.
          </p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}
