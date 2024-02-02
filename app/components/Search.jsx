"use client";

import algoliasearch from "algoliasearch/lite";
import "instantsearch.css/themes/satellite.css";
import { Hits, InstantSearch, SearchBox, Configure, DynamicWidgets, RefinementList, HierarchicalMenu } from "react-instantsearch";

import { Hit } from "./Hit";

const searchClient = algoliasearch("ZJ2NDPRTUZ", "4e8f03e6c31600da8e3218d30547bb1f");

export const Search = () => {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="defects"
    >
      <Configure hitsPerPage={5} filters="category:roof"/>
      <div className="ais-InstantSearch">
        <SearchBox />
        <Hits hitComponent={Hit} />
      </div>
    </InstantSearch>
  );
};