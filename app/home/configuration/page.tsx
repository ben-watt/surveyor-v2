"use client";

import React from "react";
import { HierarchicalConfigView } from "./components/HierarchicalConfigView";

export default function ConfigurationPage() {
  return (
    <div className="container mx-auto px-3 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:justify-between mb-4 sm:mb-5 mt-4 sm:mt-5 gap-2 sm:items-baseline">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Configuration</h1>
          <p className="text-sm text-muted-foreground">
            View and manage the hierarchical structure of sections, elements, components, and conditions.
          </p>
        </div>
      </div>
      <HierarchicalConfigView />
    </div>
  );
}