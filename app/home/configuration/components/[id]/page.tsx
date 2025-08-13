"use client";

import React from "react";
import { useParams } from "next/navigation";
import { DataForm } from "../../../building-components/form";

export default function EditComponentPage() {
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = decodeURIComponent(rawId);

  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Component</h1>
      </div>
      <DataForm id={id} />
    </div>
  );
}