"use client";

import { FormSection } from "@/app/components/FormSection";
import { useForm, UseFormRegister } from "react-hook-form";
import { ElementSection, SurveySection } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { componentStore, surveyStore } from "@/app/clients/Database";
import { ClipboardList, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDynamicDrawer } from "@/app/components/Drawer";
import InspectionForm from "./InspectionForm";
import ElementForm from "./ElementForm";

interface ConditionPageProps {
  params: {
    id: string;
  };
}

export const ConditionPage = ({ params: { id } }: ConditionPageProps) => {
  const [isHydrated, survey] = surveyStore.useGet(id);

  useEffect(() => {
    console.log("[Condition Page] isHydrated", isHydrated, survey);
  }, [isHydrated, survey]);

  return (
    <div>
      {!isHydrated && <div>Loading...</div>}
      {isHydrated && survey && (
        <ConditionForm id={id} initValues={survey.content.sections} />
      )}
    </div>
  );
};

interface ConditionFormProps {
  id: string;
  initValues: SurveySection[];
}

const ConditionForm = ({ id, initValues }: ConditionFormProps) => {
  const { openDrawer } = useDynamicDrawer();

  const onStartNewInspection = () => {
    openDrawer({
      title: "Inspect Component",
      description: "Inspect the component",
      content: <InspectionForm surveyId={id} />
    })
  }

  if(initValues.length == 0) {
    return (
      <div className="text-center p-6">
        <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center mb-4">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">No Inspections Yet</h2>
        <p className="text-muted-foreground mb-6">You haven't inspected any components in this building.</p>
        <Button onClick={onStartNewInspection}>
          Start New Inspection
        </Button>
      </div>
    )
  }

  return (
    <div>
        {initValues.map((section, sectionIndex) => (
          <FormSection key={section.name} title={section.name} collapsable>
            {section.elementSections.map((elementSection) => (
              <ElementSectionComponent
                key={elementSection.name}
                elementSection={elementSection}
                sectionName={section.name}
                surveyId={id}
              />
            ))}
          </FormSection>
        ))}
        <div className="space-y-2">
        <Button className="w-full" variant="default" onClick={onStartNewInspection}>
          Inspect Item
        </Button>
        </div>
    </div>
  );
};

interface ElementSectionProps {
  elementSection: ElementSection;
  sectionName: string;
  surveyId: string;
}

const ElementSectionComponent = ({
  elementSection,
  sectionName,
  surveyId,
}: ElementSectionProps) => {
  const { openDrawer } = useDynamicDrawer();

  return (
    <div className="border border-gray-200 p-2 rounded">
      <div className="flex justify-between items-center">
        <div>
          <h4>{elementSection.name}</h4>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openDrawer({
                title: `Edit Element - ${elementSection.name}`,
                description: `Edit the ${elementSection.name} element for survey`,
                content: <ElementForm
                  surveyId={surveyId}
                  sectionName={sectionName}
                  elementId={elementSection.id}
                />
              })}>
                Edit Element
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span className="text-red-500">Remove</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default ConditionPage;
