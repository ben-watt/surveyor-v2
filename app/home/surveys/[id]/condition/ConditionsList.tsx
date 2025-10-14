import { Button } from '@/components/ui/button';
import { FormPhrase } from './types';
import { isDocUnresolved } from '@/lib/conditions/validator';
import { ArrowDown, ArrowUp, PenLine, X } from 'lucide-react';

type ConditionsListProps = {
  conditions: FormPhrase[];
  onEdit: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  isUnresolved?: (index: number) => boolean;
};

export default function ConditionsList({
  conditions,
  onEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
  isUnresolved,
}: ConditionsListProps) {
  const items = Array.isArray(conditions) ? conditions : [];
  return (
    <div className="space-y-2">
      {items.map((condition, index) => {
        const unresolved = (isUnresolved ? isUnresolved(index) : isDocUnresolved((condition as any).doc));
        return (
          <div
            key={condition.id + '-' + index}
            className={`space-y-2 rounded-md border bg-white p-4 text-xs shadow-sm ${
              unresolved ? 'border-red-500' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">{condition.name}</p>
                {unresolved && (
                  <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                    Needs selection
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => onMoveUp(index)}
                  aria-label="Move condition up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === items.length - 1}
                  onClick={() => onMoveDown(index)}
                  aria-label="Move condition down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onEdit(index)}
                  aria-label="Edit condition"
                >
                  <PenLine className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onRemove(index)}
                  aria-label="Remove condition"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


