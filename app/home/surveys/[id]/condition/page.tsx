"use client";

import { FormSection } from "@/app/home/components/FormSection";
import {
  ElementSection,
  SurveySection,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { ClipboardList, MoreVertical, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DynamicDrawer, useDynamicDrawer } from "@/app/home/components/Drawer";
import InspectionForm from "./InspectionForm";
import ElementForm from "./ElementForm";
import { toggleElementSection } from "../../building-survey-reports/Survey";

interface ConditionPageProps {
  params: Promise<{
    id: string;
  }>;
}

const ConditionPage = (props: ConditionPageProps) => {
  const params = use(props.params);

  const {
    id
  } = params;

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
      content: <InspectionForm surveyId={id} />,
    });
  };

  if (initValues.length == 0) {
    return (
      <div className="text-center p-6">
        <div className="mx-auto bg-muted rounded-full w-12 h-12 flex items-center justify-center mb-4">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">No Inspections Yet</h2>
        <p className="text-muted-foreground mb-6">
          You haven't inspected any components in this building.
        </p>
        <Button onClick={onStartNewInspection}>Start New Inspection</Button>
      </div>
    );
  }

  const filteredSections = initValues
    .map((section) => ({
      ...section,
      elementSections: section.elementSections.filter((element) =>
        element.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))

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
          {section.elementSections.length == 0 && (
            <div className="text-center p-6">
              <p className="text-muted-foreground mb-6">
                No elements found for this section.
              </p>
            </div>
          )}
        </FormSection>
      ))}
      <div className="space-y-2">
        <Button
          className="w-full"
          variant="default"
          onClick={onStartNewInspection}
        >
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
        <ElementForm
          surveyId={surveyId}
          sectionId={sectionId}
          elementId={elementSection.id}
        />
      ),
    });
  };

  return (
    <div
      className={`border border-gray-200 p-2 rounded ${
        elementSection.isPartOfSurvey ? "" : "bg-muted/50 text-muted-foreground"
      }`}
      onClick={onEdit}
    >
      <div className="flex justify-between items-center">
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
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}>Edit</DropdownMenuItem>
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
                  {elementSection.isPartOfSurvey
                    ? "Exclude from Survey"
                    : "Include in Survey"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {elementSection.components.length} component{elementSection.components.length > 1 ? "s" : ""}
        </span>
    </div>
  );
};

export default ConditionPage;
