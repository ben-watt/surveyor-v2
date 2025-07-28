"use client";

import React from "react";
import SectionForm from "../../../sections/form";

export default function CreateSectionPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl dark:text-white">Create Section</h1>
        <p className="text-sm text-muted-foreground">Create a new section to group elements in a building survey report.</p>
      </div>
      <SectionForm />
    </div>
  );
}