'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DynamicDrawer, useDynamicDrawer } from '@/app/home/components/Drawer';
import { surveyStore } from '@/app/home/clients/Database';
import { toggleElementSection } from '../../building-survey-reports/Survey';
import type { ElementSection } from '../../building-survey-reports/BuildingSurveyReportSchema';
import { getElementCompleteness } from '@/app/home/surveys/utils/elementCompleteness';
import { Camera, CheckCircle2, CircleAlert, MoreVertical, Shapes } from 'lucide-react';
import InspectionForm from './InspectionForm';
import ElementForm from './ElementForm';

interface ElementSectionProps {
  elementSection: ElementSection;
  sectionId: string;
  surveyId: string;
}

export const ElementSectionComponent = ({
  elementSection,
  sectionId,
  surveyId,
}: ElementSectionProps) => {
  const { openDrawer } = useDynamicDrawer();
  const [isHydrated, survey] = surveyStore.useGet(surveyId);

  const toggleElement = async () => {
    if (!survey) return;
    await surveyStore.update(surveyId, (draft) => {
      toggleElementSection(draft, sectionId, elementSection.id);
    });
  };

  const onEdit = () => {
    openDrawer({
      id: `${surveyId}-condition-${elementSection.id}-edit`,
      title: `Edit Element - ${elementSection.name}`,
      description: `Edit the ${elementSection.name} element for survey`,
      content: (
        <ElementForm surveyId={surveyId} sectionId={sectionId} elementId={elementSection.id} />
      ),
    });
  };

  const completeness = getElementCompleteness(elementSection);

  return (
    <div
      className={`rounded border border-gray-200 p-2 ${
        elementSection.isPartOfSurvey ? '' : 'bg-muted/50 text-muted-foreground'
      }`}
      onClick={onEdit}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4>{elementSection.name}</h4>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer({
                    id: `${surveyId}-condition-${elementSection.id}-inspect`,
                    title: `Inspect ${elementSection.name}`,
                    description: `Add or edit inspections for ${elementSection.name}`,
                    content: (
                      <InspectionForm
                        surveyId={surveyId}
                        defaultValues={{
                          element: {
                            id: elementSection.id,
                            name: elementSection.name,
                          },
                        }}
                      />
                    ),
                  });
                }}
              >
                Inspect Component
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onSelect={toggleElement}
              >
                <span>
                  {elementSection.isPartOfSurvey ? 'Exclude from Survey' : 'Include in Survey'}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {elementSection.isPartOfSurvey ? (
        <div className="mt-1 flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  role="status"
                  aria-label={
                    completeness.hasDescription ? 'Description present' : 'Description missing'
                  }
                  className="text-muted-foreground"
                >
                  {completeness.hasDescription ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      <span>Description</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <CircleAlert className="h-3 w-3 text-red-600" />
                      <span>Description</span>
                    </span>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {completeness.hasDescription ? 'Description present' : 'Description missing'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  role="status"
                  aria-label={
                    completeness.imageCount > 0
                      ? `${completeness.imageCount} image${completeness.imageCount === 1 ? '' : 's'}`
                      : 'No images added'
                  }
                  className="text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-1">
                    <Camera
                      className={`h-3 w-3 ${completeness.imageCount > 0 ? 'text-muted-foreground' : 'text-red-600'}`}
                    />
                    <span>{completeness.imageCount}</span>
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {completeness.imageCount > 0
                  ? `${completeness.imageCount} image${completeness.imageCount === 1 ? '' : 's'}`
                  : 'No images added'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  role="status"
                  aria-label={
                    completeness.componentCount > 0
                      ? `${completeness.componentCount} component${completeness.componentCount === 1 ? '' : 's'}`
                      : '0 components'
                  }
                  className="text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-1">
                    <Shapes
                      className={`h-3 w-3 ${completeness.componentCount > 0 ? 'text-muted-foreground' : 'text-red-600'}`}
                    />
                    <span>{completeness.componentCount}</span>
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {completeness.componentCount > 0
                  ? `${completeness.componentCount} component${completeness.componentCount === 1 ? '' : 's'}`
                  : '0 components'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : null}
    </div>
  );
};

export default ElementSectionComponent;
