import { Highlight } from "react-instantsearch";
import { getPropertyByPath } from 'instantsearch.js/es/lib/utils';
import { HitProps } from "./Search";
import { DefectHitRecord } from "./SelectedDefectHit";

type AttributeProps = {
	label: string,
	value: string,
	tw?: string
}

const Attribute = ({ label, value, tw }: AttributeProps) => {
	return (
		<div className="hs-tooltip cursor-pointer mt-2">
			<span className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-gray-900 text-white" role="tooltip">{label}</span>
			<span className={`hs-tooltip-toggle pl-[3px] pr-[3px] rounded-md border border-slate-300 ${tw}`}>{value}</span>
		</div>
	)
}


export const DefectHit = ({ hit, onClick }: HitProps<DefectHitRecord>) => {
	const categoryNameProperCase = getPropertyByPath(hit, 'category').replace(/_/g, ' ').replace(/\b\w/g, (l: any) => l.toUpperCase());
	const severity = getPropertyByPath(hit, 'severity');

	function getSeverityColour(): string {
		switch (severity) {
			case 'Low':
				return '[&]:text-green-500';
			case 'Medium':
				return '[&]:text-yellow-500';
			case 'High':
				return '[&]:text-red-500';

			default:
				return ''
		}
	}

	return (
		<article onClick={onClick}>
			<div className="hit-name font-bold cursor-pointer">
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