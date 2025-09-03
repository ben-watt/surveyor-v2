"use client";

import React from "react";
import { useParams } from "next/navigation";
import { DataForm } from "../../../building-components/form";
import { PageHeader } from "@/components/page-header";

export default function ComponentEditClient() {
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = decodeURIComponent(rawId);

  return (
    <PageHeader title="Edit Component" subtitle="Edit a component used within an element.">
      <DataForm id={id} />
    </PageHeader>
  );
}