import { XMarkIcon } from "@heroicons/react/16/solid"
import type { BaseHit, Hit } from 'instantsearch.js';

export interface DefectHitRecord extends Hit<BaseHit> {
  name: string;
  common_fix: string;
  category: string;
  severity: string;
  sample_images: string[];
}

export interface SelectedDefectHitProps {
  hit: DefectHitRecord;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export default function SelectedDefectHit({ hit, onClick }: SelectedDefectHitProps) {
    return (
      <div className="relative w-full rounded-md border shadow-lg flex">
        <div className="absolute right-2 top-1 text-red-400">
          <button onClick={onClick}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div>
          <img src="https://via.placeholder.com/100" height={100} width={100} />
        </div>
        <div className="p-2">
          <h2>{hit.name} &middot; £100</h2>
          <p className="text-sm opacity-50">{hit.common_fix}</p>
        </div>
      </div>
    )
  }
