"use client";

import algoliasearch from "algoliasearch/lite";
import "instantsearch.css/themes/satellite.css";
import { Hits, InstantSearch, SearchBox, Configure, DynamicWidgets, RefinementList, HierarchicalMenu } from "react-instantsearch";

import { Hit } from "./Hit";
import { useState } from "react";

const searchClient = algoliasearch("ZJ2NDPRTUZ", "4e8f03e6c31600da8e3218d30547bb1f");

interface SearchProps {
  indexName: string;
  filters?: string;
}

export const Search = (props: SearchProps) => {
  const [query, setQueryState] = useState("");
  const hitsPerPage = query === "" ? 0 : 5;

  const [selectedHit, setSelectedHit] = useState(null)

  function reset() {
    setQueryState("")
    setSelectedHit(null)
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={props.indexName}>
      <Configure hitsPerPage={hitsPerPage} filters={props.filters} />
      <div className="ais-InstantSearch">
        <SearchBox
          onResetCapture={(ev: React.ChangeEvent<HTMLInputElement>) => reset()}
          onChangeCapture={(ev: React.ChangeEvent<HTMLInputElement>) => setQueryState(ev.target.value)} />
        {selectedHit !== null 
          ? <div>{JSON.stringify(selectedHit)}</div> 
          : <Hits hitComponent={(props) => <Hit setSelectedHit={setSelectedHit} {...props} />} />}
      </div>
    </InstantSearch>
  );
};
