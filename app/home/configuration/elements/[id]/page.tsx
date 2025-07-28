"use client";

import React, { use } from "react";
import { DataForm } from "../../../elements/form";
import { ReturnToConfigButton } from "../../components/ReturnToConfigButton";

interface EditElementPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditElementPage(props: EditElementPageProps) {
  const params = use(props.params);

  return (
    <div className="container mx-auto px-5">
      <ReturnToConfigButton />
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Element</h1>
      </div>
      <DataForm id={params.id} />
    </div>
  );
}