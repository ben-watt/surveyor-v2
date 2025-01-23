"use client";

import React from "react";
import SectionForm from "../form";
import client from "@/app/clients/AmplifyDataClient";
import { notFound } from "next/navigation";

interface EditSectionPageProps {
  params: {
    id: string;
  };
}

export default async function EditSectionPage({ params }: EditSectionPageProps) {
  const response = await client.models.Sections.get({ id: params.id });
  
  if (!response.data) {
    notFound();
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl dark:text-white">Edit Section</h1>
        <p className="text-sm text-muted-foreground">Edit an existing section used to group elements in a building survey report.</p>
      </div>
      <SectionForm initialData={response.data} />
    </div>
  );
} 