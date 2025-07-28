"use client";

import React, { use } from "react";
import SectionForm from "../form";
import client from "@/app/home/clients/AmplifyDataClient";
import { notFound } from "next/navigation";
import { sectionStore } from "@/app/home/clients/Database";
import { ReturnToConfigButton } from "@/app/home/configuration/components/ReturnToConfigButton";

interface EditSectionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditSectionPage(props: EditSectionPageProps) {
  const params = use(props.params);
  const [isHydrated, section] = sectionStore.useGet(params.id);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (isHydrated && !section) {
    return <div>Section not found with an id '{params.id}'</div>;
  }

  return (
    <div>
      <ReturnToConfigButton />
      <div className="mb-5">
        <h1 className="text-3xl dark:text-white">Edit Section</h1>
        <p className="text-sm text-muted-foreground">Edit an existing section used to group elements in a building survey report.</p>
      </div>
      <SectionForm initialData={section} />
    </div>
  );
} 