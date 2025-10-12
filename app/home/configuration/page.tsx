'use client';

import React from 'react';
import { HierarchicalConfigView } from './components/HierarchicalConfigView';

export default function ConfigurationPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="relative z-10 py-8">
        <div className="container mx-auto px-3 sm:px-5">
          <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h1 className="mb-2 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                Configuration
              </h1>
              <p className="text-lg text-gray-600">
                View and manage the hierarchical structure of sections, elements, components, and
                conditions.
              </p>
            </div>
          </div>
          <HierarchicalConfigView />
        </div>
      </div>
    </div>
  );
}
