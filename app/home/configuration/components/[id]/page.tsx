"use client";

import React, { use } from "react";
import { DataForm } from "../../../building-components/form";

interface EditComponentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditComponentPage(props: EditComponentPageProps) {
  const params = use(props.params);

  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Component</h1>
      </div>
      <DataForm id={params.id} />
    </div>
  );
}