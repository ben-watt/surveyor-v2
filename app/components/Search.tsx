"use client";

import algoliasearch from "algoliasearch/lite";
import "instantsearch.css/themes/satellite.css";
import { Hits, InstantSearch, SearchBox, Configure, DynamicWidgets, RefinementList, HierarchicalMenu } from "react-instantsearch";

import { DefectHit } from "./DefectHit";
import { ReactComponentElement, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import SelectedDefectHit, { DefectHitRecord, SelectedDefectHitProps } from "./SelectedDefectHit";

const searchClient = algoliasearch("ZJ2NDPRTUZ", "4e8f03e6c31600da8e3218d30547bb1f");

export interface SearchProps<T> {
  indexName: string;
  filters?: string;
  hitComponent: React.FC<HitProps<T>>;
  selectedHitComponent: React.FC<HitProps<T>>;
}

export interface HitProps<T> {
  hit: T;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const Search = (props: SearchProps<any>) => {
  const { indexName, filters, hitComponent: Hit, selectedHitComponent: Selected } = props;

  const [query, setQueryState] = useState("");
  const hitsPerPage = query === "" ? 0 : 5;

  const [selectedHit, setSelectedHit] = useState<any>(null)

  function reset() {
    setQueryState("")
    setSelectedHit(null)
  }


  function renderSearch() {
    return (
      <>
        <SearchBox
          onResetCapture={(ev: React.ChangeEvent<HTMLInputElement>) => reset()}
          onChangeCapture={(ev: React.ChangeEvent<HTMLInputElement>) => setQueryState(ev.target.value)} />
        <div className="absolute z-10">
          <Hits hitComponent={(props) => <Hit onClick={() => setSelectedHit(props.hit)} {...props} />} />
        </div>
      </>
    )
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={props.indexName}>
      <Configure hitsPerPage={hitsPerPage} filters={props.filters} />
      <div className="ais-InstantSearch">
        {selectedHit !== null
          ? <Selected hit={selectedHit} onClick={reset} />
          : renderSearch()}
      </div>
    </InstantSearch>
  );
};