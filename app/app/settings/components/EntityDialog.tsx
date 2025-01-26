import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntitiesToSync } from "../types";

interface EntityDialogProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: EntitiesToSync;
  onEntitiesChange: (entities: EntitiesToSync) => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  entityCounts: Record<keyof EntitiesToSync, number>;
  isLoading?: boolean;
  extraContent?: React.ReactNode;
}

export function EntityDialog({
  title,
  open,
  onOpenChange,
  entities,
  onEntitiesChange,
  onConfirm,
  confirmLabel,
  confirmVariant = "default",
  entityCounts,
  isLoading,
  extraContent,
}: EntityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="elements"
              checked={entities.elements}
              disabled={entityCounts.elements === 0}
              onCheckedChange={(checked) => 
                onEntitiesChange({ ...entities, elements: !!checked })
              }
            />
            <label htmlFor="elements" className={`text-sm font-medium leading-none ${entityCounts.elements === 0 ? 'text-gray-400' : ''}`}>
              Elements ({entityCounts.elements})
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="components"
              checked={entities.components}
              disabled={entityCounts.components === 0}
              onCheckedChange={(checked) => 
                onEntitiesChange({ ...entities, components: !!checked })
              }
            />
            <label htmlFor="components" className={`text-sm font-medium leading-none ${entityCounts.components === 0 ? 'text-gray-400' : ''}`}>
              Components ({entityCounts.components})
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="phrases"
              checked={entities.phrases}
              disabled={entityCounts.phrases === 0}
              onCheckedChange={(checked) => 
                onEntitiesChange({ ...entities, phrases: !!checked })
              }
            />
            <label htmlFor="phrases" className={`text-sm font-medium leading-none ${entityCounts.phrases === 0 ? 'text-gray-400' : ''}`}>
              Phrases ({entityCounts.phrases})
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="locations"
              checked={entities.locations}
              disabled={entityCounts.locations === 0}
              onCheckedChange={(checked) => 
                onEntitiesChange({ ...entities, locations: !!checked })
              }
            />
            <label htmlFor="locations" className={`text-sm font-medium leading-none ${entityCounts.locations === 0 ? 'text-gray-400' : ''}`}>
              Locations ({entityCounts.locations})
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sections"
              checked={entities.sections}
              disabled={entityCounts.sections === 0}
              onCheckedChange={(checked) => 
                onEntitiesChange({ ...entities, sections: !!checked })
              }
            />
            <label htmlFor="sections" className={`text-sm font-medium leading-none ${entityCounts.sections === 0 ? 'text-gray-400' : ''}`}>
              Sections ({entityCounts.sections})
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="surveys"
              checked={entities.surveys}
              disabled={entityCounts.surveys === 0}
              onCheckedChange={(checked) => 
                onEntitiesChange({ ...entities, surveys: !!checked })
              }
            />
            <label htmlFor="surveys" className={`text-sm font-medium leading-none ${entityCounts.surveys === 0 ? 'text-gray-400' : ''}`}>
              Surveys ({entityCounts.surveys})
            </label>
          </div>
          {extraContent}
        </div>
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={!Object.values(entities).some(Boolean) || isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 