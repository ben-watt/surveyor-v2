"use client";

import { Search } from "../../components/Search";

export default function Page() {
  return (
    <div className="container mx-auto px-5 ">
      <div className="flex justify-center">
        <h1 className="text-4xl dark:text-white m-4">Defect Database</h1>
      </div>
      <Search indexName={"defects"} />
    </div>
  );
}