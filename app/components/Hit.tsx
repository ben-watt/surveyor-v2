import { Highlight } from "react-instantsearch";
import { getPropertyByPath } from 'instantsearch.js/es/lib/utils';

type AttributeProps = {
	label: string,
	value: string,
	tw?: string
}

const Attribute = ({ label, value, tw }: AttributeProps) => {
	return (
		<div className="hs-tooltip cursor-pointer mt-2">
			 <span className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-gray-900 text-white" role="tooltip">{label}</span>
			<span className={`hs-tooltip-toggle p-1 rounded-md text-white bg-slate-900 ${tw}`}>{value}</span>
		</div>
	)
}	


export const Hit = ({ hit }: any) => {
 
  const categoryNameProperCase = getPropertyByPath(hit, 'category').replace(/_/g, ' ').replace(/\b\w/g, (l : any) => l.toUpperCase());
  const severity = getPropertyByPath(hit, 'severity');

  function getSeverityColour() : string {
	switch (severity) {
	  case 'Low':
		return '[&]:bg-green-500';
	  case 'Medium':
		return '[&]:bg-yellow-500';
	  case 'High':
		return '[&]:bg-red-500';

	  default:
		return ''
	}
  }

  return (
    <article>
			<div className="hit-name font-bold">
			  <Highlight attribute="name" hit={hit} />
			</div>
			<div className="hit-category">
			  <Highlight attribute="common_fix" hit={hit} />
			</div>
			<div className="hit-severity text-gray-500 flex gap-5">
			  <Attribute label="Category" value={categoryNameProperCase} />
			  <Attribute label="Severity" value={severity} tw={getSeverityColour()} />
			</div>
			{/* <img src={hit.sample_images['0']} /> */}
    </article>
  );
};