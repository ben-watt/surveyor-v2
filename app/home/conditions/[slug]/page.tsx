"use client";;
import { use } from "react";

import { DataForm } from "../form";
import { useRouter } from "next/navigation";

export default function Page(props: { params: Promise<{ slug: string }>}) {
  const params = use(props.params);
  const router = useRouter();

  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Condition</h1>
      </div>
      <DataForm id={params.slug} onSave={() => router.push("/home/conditions")} />
    </div>
  );
}
