"use client";

import { DataForm } from "../../form";
import { useRouter } from "next/navigation";

export default function Page({ params }: { params: { slug: string }}) {
  const router = useRouter();

  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Phrase</h1>
      </div>
      <DataForm id={params.slug} onSave={() => router.push("/phrases")} />
    </div>
  );
}
