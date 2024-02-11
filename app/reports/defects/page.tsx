"use client";

import { DefectHit } from "@/app/components/DefectHit";
import { SearchToSelect } from "../../components/Search";
import SelectedDefectHit from "@/app/components/SelectedDefectHit";

export default function Page() {
  return (
    <div className="container mx-auto px-5 ">
      <div className="flex justify-center">
        <h1 className="text-4xl dark:text-white m-4">Defect Database</h1>
      </div>
      <SearchToSelect indexName={"defects"} hitComponent={DefectHit} selectedHitComponent={SelectedDefectHit} onRemoveInput={() => {}}  />
    </div>
  );
}