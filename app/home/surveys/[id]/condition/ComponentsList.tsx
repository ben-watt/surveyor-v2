import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Inspection } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import InspectionForm from "./InspectionForm";

interface ComponentsListProps {
  components: Inspection[];
  surveyId: string;
  onRemoveComponent: (inspectionId: string) => void;
}

const ComponentItem = memo(({ 
  component, 
  surveyId, 
  onEdit, 
  onRemove 
}: { 
  component: Inspection;
  surveyId: string;
  onEdit: (component: Inspection) => void;
  onRemove: (inspectionId: string) => void;
}) => {
  const ragColorClass = {
    Red: "bg-red-500",
    Amber: "bg-amber-500",
    Green: "bg-green-500",
    "N/I": "bg-gray-500"
  }[component.ragStatus] || "bg-gray-500";

  const displayName = component.useNameOverride ? component.nameOverride : component.name;

  return (
    <div className="flex items-center justify-between p-1 pl-4 border rounded-lg">
      <div className="flex items-center space-x-4 min-w-20">
        <div className={`flex-shrink-0 w-4 h-4 rounded-sm ${ragColorClass}`} />
        <span className="text-sm truncate min-w-0 flex-1">{displayName}</span>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        <Button
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            onEdit(component);
          }}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          className="text-red-500 hover:text-red-700"
          onClick={(e) => {
            e.preventDefault();
            onRemove(component.inspectionId);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

ComponentItem.displayName = 'ComponentItem';

export const ComponentsList = memo(({ 
  components = [], 
  surveyId, 
  onRemoveComponent 
}: ComponentsListProps) => {
  const drawer = useDynamicDrawer();

  const handleEditComponent = useCallback((component: Inspection) => {
    drawer.openDrawer({
      id: `${surveyId}-condition-inspect-${component.id}`,
      title: `Inspect Component - ${component.name}`,
      description: `Inspect the ${component.name} component`,
      content: <InspectionForm
        surveyId={surveyId}
        componentId={component.id}
      />
    });
  }, [drawer, surveyId]);

  if (components.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No components added yet.
      </div>
    );
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
});

ComponentsList.displayName = 'ComponentsList';