'use client';

import { useState } from 'react';

export default function TestImages() {
  const [message, setMessage] = useState('Enhanced Image Store Test Page');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{message}</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Basic Test</h2>
        <p>This is a simple test page to verify routing works.</p>

        <button
          onClick={() => setMessage('Test page is working!')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Click to Test
        </button>
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded">
        <h3 className="font-semibold">Next Steps:</h3>
        <p>If you can see this page, then routing is working and we can debug the enhanced image components.</p>
      </div>
    </div>
  );
}