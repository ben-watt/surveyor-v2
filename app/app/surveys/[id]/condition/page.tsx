"use client";

import { FormSection } from "@/app/app/components/FormSection";
import { ElementSection, SurveySection } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/app/clients/Database";
import { ClipboardList, MoreHorizontal, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DynamicDrawer, useDynamicDrawer } from "@/app/app/components/Drawer";
import InspectionForm from "./InspectionForm";
import ElementForm from "./ElementForm";
import { excludeElementSection } from "../../building-survey-reports/Survey";

interface ConditionPageProps {
  params: {
    id: string;
  };
}

const ConditionPage = ({ params: { id } }: ConditionPageProps) => {
  const [isHydrated, survey] = surveyStore.useGet(id);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  useEffect(() => {
    if (isHydrated) {
      setIsOpen(true);
    }
  }, [isHydrated]);

  return (
    <div>
      {!isHydrated && <div>Loading...</div>}
      {isHydrated && survey && (
        <DynamicDrawer
          id={id + "-condition"}
          isOpen={isOpen}
          handleClose={handleClose}
          title="Property Condition"
          description="Property Condition"
          content={<ConditionForm id={id} initValues={survey.sections} />}
        />
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
  const [searchTerm, setSearchTerm] = useState("");

  const onStartNewInspection = () => {
    openDrawer({
      id: `${id}-condition-inspect`,
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

  const filteredSections = initValues.map(section => ({
    ...section,
    elementSections: section.elementSections.filter(element =>
      element.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.elementSections.length > 0);

  return (
    <div>
        <div className="mb-4 relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search elements..."
              className="w-full p-2 pl-9 border rounded-md bg-background hover:bg-accent/50 focus:bg-background transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted-foreground">
             <Search className="h-5 w-5" />
            </div>
          </div>
        </div>
        {filteredSections.map((section, sectionIndex) => (
          <FormSection 
            key={section.name} 
            title={section.name} 
            collapsable
            defaultCollapsed={!(searchTerm.length > 0)}
          >
            {section.elementSections.map((elementSection) => (
              <ElementSectionComponent
                key={elementSection.name}
                elementSection={elementSection}
                sectionId={section.id}
                surveyId={id}
              />
            ))}
          </FormSection>
        ))}
        <div className="space-y-2">
          <Button className="w-full" variant="default" onClick={onStartNewInspection}>
            Inspect Component
          </Button>
        </div>
    </div>
  );
};

interface ElementSectionProps {
  elementSection: ElementSection;
  sectionId: string;
  surveyId: string;
}

const ElementSectionComponent = ({
  elementSection,
  sectionId,
  surveyId,
}: ElementSectionProps) => {
  const { openDrawer } = useDynamicDrawer();
  const [isHydrated, survey] = surveyStore.useGet(surveyId);

  const handleRemove = async () => {
    if (!survey) return;
    await surveyStore.update(surveyId, (draft) => {
      excludeElementSection(draft, sectionId, elementSection.id);
    });
  };

  return (
    <div className={`border border-gray-200 p-2 rounded ${elementSection.isPartOfSurvey ? "" : "bg-muted/50 text-muted-foreground"}`}>
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
                id: `${surveyId}-condition-${elementSection.id}-edit`,
                title: `Edit Element - ${elementSection.name}`,
                description: `Edit the ${elementSection.name} element for survey`,
                content: <ElementForm
                  surveyId={surveyId}
                  sectionId={sectionId}
                  elementId={elementSection.id}
                />
              })}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDrawer({
                id: `${surveyId}-condition-${elementSection.id}-inspect`,
                title: `Inspect ${elementSection.name}`,
                description: `Add or edit inspections for ${elementSection.name}`,
                content: <InspectionForm
                  surveyId={surveyId}
                  defaultValues={{
                    element: {
                      id: elementSection.id,
                      name: elementSection.name,
                    },
                  }}
                />
              })}>
                Inspect Component
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRemove}>
                <span className="text-red-500">Exclude from Survey</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default ConditionPage;
