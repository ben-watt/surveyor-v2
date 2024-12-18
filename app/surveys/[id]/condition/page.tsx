"use client";

import { FormSection } from "@/app/components/FormSection";
import {
  FormProvider,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  useFormContext,
  UseFormRegister,
} from "react-hook-form";
import {
  PropertyDescription,
  Input,
  ElementSection,
  SurveySection,
  BuildingSurveyFormData,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { componentStore, surveyStore } from "@/app/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { PrimaryBtn } from "@/app/components/Buttons";
import { MoreHorizontal, Router } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DynamicDrawer } from "@/app/components/Drawer";
import SmartTextArea from "@/app/components/Input/SmartTextArea";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { db } from "@/app/clients/Dexie";
import { Combobox } from "@/app/components/Input/ComboBox";

function isInputT<T>(input: any): input is Input<T> {
  return input.type !== undefined;
}

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
  const methods = useForm<SurveySection[]>({ defaultValues: initValues });
  const { register, handleSubmit } = methods;
  const router = useRouter();

  console.log("[ConditionForm] initValues", initValues);

  // TODO: Need to ensure I don't overwrite the existing data
  // for the property data fields.
  const onValidSubmit: SubmitHandler<SurveySection[]> = (data) => {
    surveyStore.update(id, (currentState) => {});
    router.push(`/surveys/${id}`);
  };

  const onInvalidSubmit: SubmitErrorHandler<SurveySection[]> = (errors) => {
    // surveyStore.update(id, (currentState) => {
    //   currentState.content.condition.status = {
    //     status: "incomplete",
    //     errors: Object.values(errors).map((error) => error.message ?? ""),
    //   };
    // });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}>
        {initValues.map((section, sectionIndex) => (
          <FormSection key={section.name} title={section.name} collapsable>
            {section.elementSections.map((elementSection, elementIndex) => (
              <ElementSectionComponent
                key={elementSection.name}
                elementSection={elementSection}
                sectionIndex={sectionIndex}
                elementIndex={elementIndex}
                register={register}
              />
            ))}
          </FormSection>
        ))}
        <PrimaryBtn type="submit">Save</PrimaryBtn>
      </form>
    </FormProvider>
  );
};

interface ElementSectionProps {
  elementSection: ElementSection;
  elementIndex: number;
  sectionIndex: number;
  register: UseFormRegister<SurveySection[]>;
}

const ElementSectionComponent = ({
  elementSection,
  sectionIndex,
  elementIndex,
  register,
}: ElementSectionProps) => {
  const [isElementDialogOpen, setElementDialogOpen] = useState<boolean>(false);
  const [descriptionText, setDescriptionText] = useState<string>(
    elementSection.description
  );

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
              <DropdownMenuItem onClick={() => setElementDialogOpen(true)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}}>
                Add Component
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}}>
                Upload Photos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span className="text-red-500">Remove</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DynamicDrawer
          isOpen={isElementDialogOpen}
          title={`Edit Element - ${elementSection.name}`}
          description={`Edit the ${elementSection.name} element for survey`}
          handleClose={() => setElementDialogOpen(false)}
          content={
            <EditElement id={elementSection.id} {...{ descriptionText, register, sectionIndex, elementIndex, }}/>
          }
        />
      </div>
    </div>
  );
};

interface EditElementProps {
   id: string
   descriptionText: string
   register: UseFormRegister<SurveySection[]>
   sectionIndex: number
   elementIndex: number
}

const EditElement = ({ id, descriptionText, register, sectionIndex, elementIndex }: EditElementProps) => {
  const [isHydrated, components] = componentStore.useList();

  console.log("[EditElement] isLoading", isHydrated, components);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold">Description</p>
        <TextAreaInput
          placeholder={descriptionText}
          register={() => register(
            `${sectionIndex}.elementSections.${elementIndex}.description` as const,
            { required: true }
          )} />
      </div>
      <div>
        <p className="text-base font-semibold">Components</p>
        {!isHydrated && <div>Loading...</div>}
        <div className="space-y-1">
          {isHydrated && components.length > 0 && (
            components.filter(x => x.elementId == id).map((component, index) => (
              <div
                key={index}
                className="border border-gray-200 p-2 rounded flex items-center justify-between"
              >
                <h5>{component.name}</h5>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => {}}>
                      Add Defect
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {}}>
                      Upload Photos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <span className="text-red-500">Remove from Survey</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
        {isHydrated && components.length == 0 && (
          <p className="text-sm">No components found for this element</p>
        )}
      </div>
    </div>
  );
}

export default ConditionPage;


