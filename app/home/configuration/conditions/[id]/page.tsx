"use client";

import React, { use } from "react";
import { DataForm } from "../../../conditions/form";
import { ReturnToConfigButton } from "../../components/ReturnToConfigButton";

interface EditConditionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditConditionPage(props: EditConditionPageProps) {
  const params = use(props.params);

  return (
    <div className="container mx-auto px-5">
      <ReturnToConfigButton />
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Condition</h1>
      </div>
      <DataForm id={params.id} />
    </div>
  );
}