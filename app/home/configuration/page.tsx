"use client";

import React from "react";
import { HierarchicalConfigView } from "./components/HierarchicalConfigView";

export default function ConfigurationPage() {
  return (
    <div className="container mx-auto px-5">
      <div className="flex justify-between mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Configuration</h1>
          <p className="text-sm text-muted-foreground">
            View and manage the hierarchical structure of sections, elements, components, and conditions.
          </p>
        </div>
      </div>
      <HierarchicalConfigView />
    </div>
  );
}