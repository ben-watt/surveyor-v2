"use client";

import React from "react";
import { HierarchicalConfigView } from "./components/HierarchicalConfigView";

export default function ConfigurationPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="relative z-10 py-8">
        <div className="container mx-auto px-3 sm:px-5">
          <div className="flex flex-col sm:flex-row sm:justify-between mb-6 sm:mb-8 gap-2 sm:items-baseline">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">Configuration</h1>
              <p className="text-lg text-gray-600">
                View and manage the hierarchical structure of sections, elements, components, and conditions.
              </p>
            </div>
          </div>
          <HierarchicalConfigView />
        </div>
      </div>
    </div>
  );
}