import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Inspection } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { useDynamicDrawer } from '@/app/home/components/Drawer';
import InspectionForm from './InspectionForm';

interface ComponentsListProps {
  components: Inspection[];
  surveyId: string;
  onRemoveComponent: (inspectionId: string) => void;
}

const ComponentItem = memo(
  ({
    component,
    surveyId,
    onEdit,
    onRemove,
  }: {
    component: Inspection;
    surveyId: string;
    onEdit: (component: Inspection) => void;
    onRemove: (inspectionId: string) => void;
  }) => {
    const ragColorClass =
      {
        Red: 'bg-red-500',
        Amber: 'bg-amber-500',
        Green: 'bg-green-500',
        'N/I': 'bg-gray-500',
      }[component.ragStatus] || 'bg-gray-500';

    const displayName = component.useNameOverride ? component.nameOverride : component.name;

    return (
      <div className="flex items-center justify-between rounded-lg border p-1 pl-4">
        <div className="flex min-w-20 items-center space-x-4">
          <div className={`h-4 w-4 flex-shrink-0 rounded-sm ${ragColorClass}`} />
          <span className="min-w-0 flex-1 truncate text-sm">{displayName}</span>
        </div>
        <div className="flex flex-shrink-0 items-center space-x-2">
          <Button
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              onEdit(component);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.preventDefault();
              onRemove(component.inspectionId);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  },
);

ComponentItem.displayName = 'ComponentItem';

export const ComponentsList = memo(
  ({ components = [], surveyId, onRemoveComponent }: ComponentsListProps) => {
    const drawer = useDynamicDrawer();

    const handleEditComponent = useCallback(
      (component: Inspection) => {
        drawer.openDrawer({
          id: `${surveyId}-condition-inspect-${component.id}`,
          title: `Inspect Component - ${component.name}`,
          description: `Inspect the ${component.name} component`,
          content: <InspectionForm surveyId={surveyId} componentId={component.id} />,
        });
      },
      [drawer, surveyId],
    );

    if (components.length === 0) {
      return <div className="py-4 text-center text-gray-500">No components added yet.</div>;
    }

    return (
      <div className="space-y-2">
        {components.map((component) => (
          <ComponentItem
            key={component.inspectionId}
            component={component}
            surveyId={surveyId}
            onEdit={handleEditComponent}
            onRemove={onRemoveComponent}
          />
        ))}
      </div>
    );
  },
);

ComponentsList.displayName = 'ComponentsList';
