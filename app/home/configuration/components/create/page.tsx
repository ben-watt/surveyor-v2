"use client";

import React from "react";
import { DataForm } from "../../../building-components/form";
import { useSearchParams } from "next/navigation";

export default function CreateComponentPage() {
  const searchParams = useSearchParams();
  const parentType = searchParams.get('parentType');
  const parentId = searchParams.get('parentId');
  const defaultValues = parentType === 'element' && parentId
    ? { elementId: parentId }
    : undefined;
  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Create Component</h1>
      </div>
      <DataForm defaultValues={defaultValues} />
    </div>
  );
}