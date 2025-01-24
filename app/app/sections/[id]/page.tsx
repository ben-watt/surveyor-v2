"use client";

import React from "react";
import SectionForm from "../form";
import client from "@/app/app/clients/AmplifyDataClient";
import { notFound } from "next/navigation";
import { sectionStore } from "@/app/app/clients/Database";

interface EditSectionPageProps {
  params: {
    id: string;
  };
}

export default function EditSectionPage({ params }: EditSectionPageProps) {
  const [isHydrated, section] = sectionStore.useGet(params.id);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (!section) {
    notFound();
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl dark:text-white">Edit Section</h1>
        <p className="text-sm text-muted-foreground">Edit an existing section used to group elements in a building survey report.</p>
      </div>
      <SectionForm initialData={section} />
    </div>
  );
} 