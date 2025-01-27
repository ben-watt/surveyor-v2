"use client";

import { useRouter } from "next/navigation";
import { DataForm } from "../form";

export default function Page() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Create a Condition</h1>
      </div>
      <DataForm onSave={() => router.push("/app/conditions")} />
    </div>
  )
}