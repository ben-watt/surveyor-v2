"use client";

import React from "react";
import { useParams } from "next/navigation";
import SectionForm from "../../../sections/form";
import { sectionStore } from "@/app/home/clients/Database";
import { PageHeader } from "@/components/page-header";

export default function EditSectionPage() {
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = decodeURIComponent(rawId);
  const [isHydrated, section] = sectionStore.useGet(id);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (isHydrated && !section) {
    return <div>Section not found with an id '{id}'</div>;
  }

  return (
    <PageHeader title="Edit Section" subtitle="Edit an existing section used to group elements in a building survey report.">
      <SectionForm initialData={section} />
    </PageHeader>
  );
}