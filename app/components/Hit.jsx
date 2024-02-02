import { Highlight } from "react-instantsearch";
import { getPropertyByPath } from 'instantsearch.js/es/lib/utils';

export const Hit = ({ hit }) => {
  return (
    <article>
      {/* <img src={hit.sample_images['0']} /> */}
			<div className="hit-name font-bold">
			  <Highlight attribute="name" hit={hit} />
			</div>
			<div className="hit-category">
			  <Highlight attribute="common_fix" hit={hit} />
			</div>
			<div className="hit-severity text-gray-500">
			  <span>{getPropertyByPath(hit, 'severity')}</span>
			</div>
    </article>
  );
};