"use client";

import searchClient from "@/app/clients/SearchClient";
import { Hits, InstantSearch, SearchBox, Configure } from "react-instantsearch";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

export interface SearchProps<T> {
  indexName: string;
  filters?: string;
  onRemoveInput: React.MouseEventHandler<HTMLDivElement>;
  hitComponent: React.FC<HitProps<T>>;
  selectedHitComponent: React.FC<HitProps<T>>;
}

export interface HitProps<T> {
  hit: T;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const SearchToSelect = (props: SearchProps<any>) => {
  const { indexName, filters, onRemoveInput, hitComponent: Hit, selectedHitComponent: Selected } = props;

  const [query, setQueryState] = useState("");
  const hitsPerPage = query === "" ? 0 : 5;

  const [selectedHit, setSelectedHit] = useState<any>(null)

  function reset(ev: any) {
    setQueryState("")
    setSelectedHit(null)
  }


  function renderSearch() {
    return (
      <>
        <div className="relative">
          <SearchBox
            onResetCapture={(ev: React.ChangeEvent<HTMLInputElement>) => reset(ev)}
            onAbort={(ev: React.ChangeEvent<HTMLInputElement>) => console.log("abort", ev)}
            onChangeCapture={(ev: React.ChangeEvent<HTMLInputElement>) => setQueryState(ev.target.value)} />
          {query == "" && <div className="absolute text-red-600 top-3 right-[1.1rem] cursor-pointer" onClick={onRemoveInput}><XMarkIcon className="w-4 h-4" /></div>}
        </div>

        <div className="absolute z-10">
          <Hits hitComponent={(props) => <Hit onClick={() => setSelectedHit(props.hit)} {...props} />} />
        </div>
      </>
    )
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}>
      <Configure hitsPerPage={hitsPerPage} filters={props.filters} query="" />
      <div className="ais-InstantSearch">
        {selectedHit !== null
          ? <Selected hit={selectedHit} onClick={reset} />
          : renderSearch()}
      </div>
    </InstantSearch>
  );
};