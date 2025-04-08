import { useState } from 'react';
import Header from '@/components/Header';
import FilterControls from '@/components/FilterControls';
import Instructions from '@/components/Instructions';
import CalendarView from '@/components/CalendarView';

export default function Home() {
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
}
