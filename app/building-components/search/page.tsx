"use client";

import { InfiniteHits, InstantSearch, SearchBox } from "react-instantsearch";
import searchClient from "@/app/clients/SearchClient";
import { DefectHit } from "@/app/components/DefectHit";
import { DefectHitRecord } from "@/app/components/SelectedDefectHit";

interface HitProps {
  hit: DefectHitRecord;
}

const Hit = ({ hit }: HitProps) => <DefectHit hit={hit} onClick={() => {}} />;

export default function Page() {
  return (
    <div className="container mx-auto px-5 ">
      <div className="flex justify-center">
        <h1 className="text-4xl dark:text-white m-4">Defect Database</h1>
      </div>
      <InstantSearch indexName="defects" searchClient={searchClient}>
        <SearchBox />
        <InfiniteHits hitComponent={Hit} />
      </InstantSearch>
    </div>
  );
}
