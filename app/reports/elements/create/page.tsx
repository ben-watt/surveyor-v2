"use client";

import { DataForm } from "../form";

export default function Page() {
  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Create Element</h1>
      </div>
      <DataForm />
    </div>
  )
}