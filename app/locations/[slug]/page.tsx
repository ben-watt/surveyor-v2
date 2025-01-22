"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DataForm } from "../form";

interface Props {
  params: {
    slug: string;
  };
}

export default function Page({ params }: Props) {
  const router = useRouter();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between mb-5">
        <div>
          <h1 className="text-3xl dark:text-white">Edit Location</h1>
          <p className="text-sm text-muted-foreground">
            Update the location details.
          </p>
        </div>
      </div>
      <DataForm id={params.slug} onSave={() => router.push("/locations")} />
    </div>
  );
} 