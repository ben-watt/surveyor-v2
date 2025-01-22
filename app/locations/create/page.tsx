"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DataForm } from "../form";

export default function Page() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between mb-5">
        <div>
          <h1 className="text-3xl dark:text-white">Create Location</h1>
          <p className="text-sm text-muted-foreground">
            Add a new location to your property.
          </p>
        </div>
      </div>
      <DataForm onSave={() => router.push("/locations")} />
    </div>
  );
} 