import React from 'react';

export default function DebugPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
        <p className="mb-4">If you can see this page, basic React rendering is working.</p>
        <div className="p-4 bg-gray-100 rounded mb-4">
          <h2 className="text-lg font-semibold mb-2">Environment Info</h2>
          <ul className="space-y-1 text-sm">
            <li>React is running: ✓</li>
            <li>Current time: {new Date().toLocaleString()}</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          This is a diagnostic page to help identify rendering issues.
        </p>
      </div>
    </div>
  );
}