"use client";;
import { use } from "react";

import { DataForm } from "../form";

export default function Page(props: { params: Promise<{ slug: string }>}) {
  const params = use(props.params);
  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Edit Component</h1>
      </div>
      <DataForm id={params.slug} />
    </div>
  );
}
