"use client";

import React from "react";
import { useParams } from "next/navigation";
import { DataForm } from "../../../conditions/form";
import { PageHeader } from "@/components/page-header";

export default function ConditionEditClient() {
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = decodeURIComponent(rawId);

  return (
    <PageHeader title="Edit Condition" subtitle="Edit a condition used to describe the state of components.">
      <DataForm id={id} />
    </PageHeader>
  );
}