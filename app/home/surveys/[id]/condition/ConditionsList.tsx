import { Button } from '@/components/ui/button';
import { FormPhrase } from './types';
import {
  isConditionUnresolved,
  isConditionUnresolvedForLevel,
  isMissingLevel2Content,
} from '@/lib/conditions/validator';
import { AlertCircle, ArrowDown, ArrowUp, MoreHorizontal, PenLine, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

type ConditionsListProps = {
  conditions: FormPhrase[];
  onEdit: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  isUnresolved?: (index: number) => boolean;
  surveyLevel?: '2' | '3'; // Optional: Used to show specific warning messages
};

export default function ConditionsList({
  conditions,
  onEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
  isUnresolved,
  surveyLevel,
}: ConditionsListProps) {
  const items = Array.isArray(conditions) ? conditions : [];
  return (
    <div className="space-y-2">
      {items.map((condition, index) => {
        const unresolved = isUnresolved
          ? isUnresolved(index)
          : isConditionUnresolved(condition as any);

        // Determine specific warning message
        let warningMessage = 'Needs selection';
        if (unresolved && surveyLevel) {
          const hasUnresolvedSelections = isConditionUnresolvedForLevel(
            condition as any,
            surveyLevel,
          );
          const missingLevel2 = surveyLevel === '2' && isMissingLevel2Content(condition as any);

          if (missingLevel2 && !hasUnresolvedSelections) {
            warningMessage = 'Missing Level 2 content';
          } else if (missingLevel2 && hasUnresolvedSelections) {
            warningMessage = 'Needs selection & missing Level 2 content';
          }
        }

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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle
                          aria-label={warningMessage}
                          className="h-3.5 w-3.5 text-red-600"
                        />
                      </TooltipTrigger>
                      <TooltipContent>{warningMessage}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center gap-1">
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
                {/* md+: inline Edit/Remove */}
                <div className="hidden md:flex gap-1">
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
                {/* <md: overflow menu for Edit/Remove */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" aria-label="More actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(index)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRemove(index)}>Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
