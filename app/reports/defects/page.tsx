"use client";

import { InfiniteHits, InstantSearch, SearchBox } from "react-instantsearch";
import searchClient from "@/app/clients/SearchClient";
import { DefectHit } from "@/app/components/DefectHit";

const Hit = ({ hit }) => (
  <div className="border-2 m-1 p-2 rounded-sm">
    <DefectHit hit={hit} onClick={() => {}} />
  </div>
)

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
