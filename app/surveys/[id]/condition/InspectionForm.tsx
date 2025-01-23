import React, { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider, FieldErrors } from "react-hook-form";
import { FormSection } from "@/app/components/FormSection";
import {
  RagStatus,
  ElementSection,
} from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  componentStore,
  elementStore,
  phraseStore,
  surveyStore,
} from "@/app/clients/Database";
import { RhfInputImage } from "@/app/components/Input/InputImage";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import surveySections from "@/app/settings/surveySections.json";
import { Combobox } from "@/app/components/Input/ComboBox";
import { useDynamicDrawer } from "@/app/components/Drawer";
import toast from "react-hot-toast";
import { Edit, PenLine } from "lucide-react";
import ElementForm from "./ElementForm";
import { Skeleton } from "@/components/ui/skeleton";
import { DataForm as ElementDataForm } from "@/app/elements/form";
import { DataForm as ComponentDataForm } from "@/app/building-components/form";
import { DataForm as PhraseDataForm } from "@/app/phrases/form";
import Input from "@/app/components/Input/InputText";
import { Survey } from "@/app/clients/Dexie";
import { addOrUpdateComponent, findComponent } from "@/app/surveys/building-survey-reports/Survey";

import { Phrase } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";


const RAG_OPTIONS = [
  { value: "Red", label: "Red" },
  { value: "Amber", label: "Amber" },
  { value: "Green", label: "Green" },
  { value: "N/I", label: "Not Inspected" },
];

type InspectionFormData = {
  location: string;
  surveySection: string;
  element: {
    id: string;
    name: string;
  };
  component: {
    id: string;
    name: string;
  };
  nameOverride: string;
  useNameOverride: boolean;
  additionalDescription: string;
  images: string[];
  ragStatus: RagStatus;
  conditions: Phrase[];
};

interface InspectionFormProps {
  surveyId: string;
  componentId?: string; // Optional - if provided, will pre-populate form from survey data
}

export default function InspectionForm({
  surveyId,
  componentId,
}: InspectionFormProps) {
  const [componentsHydrated, components] = componentStore.useList();
  const [elementsHydrated, elements] = elementStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();
  const [isHydrated, survey] = surveyStore.useGet(surveyId);

  const drawer = useDynamicDrawer();
  const [showNameOverride, setShowNameOverride] = useState(false);

  let defaultValues: InspectionFormData = {
    location: "",
    surveySection: "",
    element: { id: "", name: "" },
    component: {
      id: "",
      name: "",
    },
    nameOverride: "",
    useNameOverride: false,
    additionalDescription: "",
    images: [],
    ragStatus: "N/I",
    conditions: [],
  };

  const methods = useForm<InspectionFormData>({ defaultValues });
  const { reset } = methods;

  useEffect(() => {
    if (!isHydrated) return;

    if (componentId && survey) {
      const { component, elementSection, sectionName } = findComponent(survey, componentId);
      
      if (component && elementSection && sectionName) {
        let restoredValues = {
          location: component.location || "",
          surveySection: sectionName,
          element: {
            id: elementSection.id,
            name: elementSection.name,
          },
          component: {
            id: component.id,
            name: component.name,
          },
          nameOverride: component.nameOverride || component.name,
          useNameOverride: component.useNameOverride || false,
          ragStatus: component.ragStatus,
          conditions: component.conditions || [],
          additionalDescription: component.additionalDescription || "",
          images: component.images || [],
        };

        reset(restoredValues);
      }
    }
  }, [isHydrated, survey, componentId, reset]);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    control,
    formState: { errors },
  } = methods;
  const formValues = watch();

  // Memoize the filtered elements based on selected survey section
  const elementOptions = useMemo(() => {
    return elements.map((element) => ({
      value: { id: element.id, name: element.name },
      label: element.name,
    }));
  }, [elements]);

  // Memoize the filtered components based on selected element
  const componentOptions = useMemo(() => {
    const filteredComponents = components.filter(
      (component) => component.elementId === formValues.element.id
    );
    return filteredComponents.map((component) => ({
      value: {
        id: component.id,
        name: component.name,
      },
      label: component.name,
    }));
  }, [components, formValues.element]);

  // Memoize the filtered phrases for conditions and defects
  const phrasesOptions = useMemo(() => {
    const filteredPhrases = phrases.filter(
      (phrase) =>
        phrase.associatedComponentIds.includes(formValues.component.id)
    );
    return filteredPhrases.map((phrase) => ({
      value: phrase,
      label: phrase.name,
    }));
  }, [phrases, formValues.component.id]);

  // Reset dependent fields when survey section changes
  useEffect(() => {
    const elementExists = elements.some(
      (e) =>
        e.id === formValues.element.id && e.section === formValues.surveySection
    );

    if (formValues.surveySection && !elementExists && formValues.element.id) {
      setValue("element", defaultValues.element, { shouldDirty: false });
      setValue("component", defaultValues.component, { shouldDirty: false });
    }
  }, [
    formValues.surveySection,
    formValues.element.id,
    setValue,
    defaultValues.element,
    defaultValues.component,
    elements,
  ]);

  // Reset component when element changes
  useEffect(() => {
    const componentExists = components.some(
      (c) =>
        c.id === formValues.component.id &&
        c.elementId === formValues.element.id
    );

    if (formValues.element && !componentExists && formValues.component.id) {
      setValue("component", defaultValues.component);
      setValue("conditions", []); // Clear conditions when component is reset
    }
  }, [
    formValues.element,
    formValues.component.id,
    components,
    setValue,
    defaultValues.component,
  ]);

  // Reset nameOverride visibility and conditions when component changes
  useEffect(() => {
    if (!formValues.component.id) {
      setShowNameOverride(false);
      setValue("conditions", []); // Clear conditions when component is cleared
    } else if (showNameOverride) {
      setValue("nameOverride", formValues.component.name);
    }
  }, [formValues.component.id, formValues.component.name, showNameOverride, setValue]);

  const onValid = async (data: InspectionFormData) => {
    console.log("[InspectionForm] onValid", data);

    await surveyStore.update(surveyId, (survey) => {
      return addOrUpdateComponent(
        survey,
        data.surveySection,
        data.element.id,
        data.element.name,
        elements.find(e => e.id === data.element.id)?.description || "",
        {
          id: data.component.id,
          name: data.component.name,
          nameOverride: data.nameOverride,
          useNameOverride: data.useNameOverride,
          location: data.location,
          additionalDescription: data.additionalDescription,
          images: data.images,
          conditions: data.conditions,
          ragStatus: data.ragStatus,
        }
      );
    });

    drawer.closeDrawer();
    toast.success("Inspection saved");
  };

  const onInvalid = (errors: FieldErrors<InspectionFormData>) => {
    console.log(errors);
  };

  const surveySectionOptions = useMemo(() => {
    // If no element is selected, show all sections
    if (!formValues.element.id) {
      return surveySections.map((section) => ({
        value: section.name,
        label: section.name,
      }));
    }

    // Find the element in the elements list to get its section
    const selectedElement = elements.find(
      (e) => e.id === formValues.element.id
    );
    if (!selectedElement) return [];

    // Filter survey sections to only show the one matching the element's section
    return surveySections
      .filter((section) => section.name === selectedElement.section)
      .map((section) => ({
        value: section.name,
        label: section.name,
      }));
  }, [formValues.element.id, elements]);

  // Reset survey section when element changes
  useEffect(() => {
    if (formValues.element.id) {
      const selectedElement = elements.find(
        (e) => e.id === formValues.element.id
      );
      if (selectedElement) {
        setValue("surveySection", selectedElement.section);
      }
    }
  }, [formValues.element.id, elements, setValue]);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <FormSection title="Basic Information">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </FormSection>
        <FormSection title="Component Details">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </FormSection>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-6">
        <FormSection title="Basic Information">
          <div className="flex items-end gap-2 justify-between">
            <Combobox
              labelTitle="Element"
              data={elementOptions}
              name="element"
              control={control}
              errors={errors}
              onCreateNew={() => {
                drawer.openDrawer({
                  title: `Create a new element`,
                  description: `Create a new element for any survey`,
                  content: <ElementDataForm />,
                });
              }}
              rules={{
                required: "Element is required",
              }}
            />
            <Button
              className="flex-none"
              variant="outline"
              disabled={formValues.element.id === ""}
              onClick={(e) => {
                e.preventDefault();
                drawer.openDrawer({
                  title: `Edit Element - ${formValues.element.name}`,
                  description: `Edit the ${formValues.element.name} element for survey`,
                  content: (
                    <ElementForm
                      surveyId={surveyId}
                      sectionName={formValues.surveySection}
                      elementId={formValues.element.id}
                    />
                  ),
                });
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
          <Combobox
            labelTitle="Survey Section"
            data={surveySectionOptions}
            name="surveySection"
            control={control}
            errors={errors}
            rules={{
              required: "Survey section is required",
            }}
          />
        </FormSection>
        <FormSection title="Component Details">
          <div className="flex items-end gap-2 justify-between">
            <Combobox
              labelTitle="Component"
              data={componentOptions}
              name="component"
              control={control}
              errors={errors}
              onCreateNew={() => {
                drawer.openDrawer({
                  title: `Create a new component`,
                  description: `Create a new component for any element`,
                  content: (
                    <ComponentDataForm
                      defaultValues={{
                        elementId: formValues.element.id,
                      }}
                    />
                  ),
                });
              }}
              rules={{
                required: true,
              }}
            />
            <Button
              className="flex-none"
              variant="outline"
              disabled={formValues.component.name === undefined}
              onClick={(e) => {
                e.preventDefault();
                setValue("useNameOverride", !formValues.useNameOverride);
                setShowNameOverride(!showNameOverride);
              }}
            >
              <PenLine className="w-4 h-4" />
            </Button>
          </div>
          {showNameOverride && formValues.component.id && (
            <Input
              type="text"
              labelTitle="Component Name Override"
              register={() => register("nameOverride")}
              errors={errors}
              defaultValue={formValues.component.name}
              placeholder="Enter custom component name"
            />
          )}
          <Combobox
            labelTitle="RAG Status"
            data={RAG_OPTIONS}
            name="ragStatus"
            control={control}
            errors={errors}
            rules={{
              required: "RAG status is required",
            }}
          />
          <Combobox
            labelTitle="Condition"
            data={phrasesOptions}
            name="conditions"
            control={control}
            errors={errors}
            isMulti={true}
            onCreateNew={() => {
              drawer.openDrawer({
                title: `Create a new condition phrase`,
                description: `Create a new condition phrase for any surveys`,
                content: (
                  <PhraseDataForm
                    onSave={() => {
                      drawer.closeDrawer();
                    }}
                    defaultValues={{
                      type: "Condition",
                      associatedComponentIds: [formValues.component.id],
                      associatedElementIds: [formValues.element.id],
                    }}
                  />
                ),
              });
            }}
          />
          {Array.isArray(formValues.conditions) && (
            <DraggableConditions
              conditions={formValues.conditions}
              control={control}
              setValue={setValue}
              watch={watch}
            />
          )}
          <TextAreaInput
            labelTitle="Additional Comments"
            register={() => register("additionalDescription")}
            placeholder="Enter component description"
          />
          <div className="space-y-2">
            <Label>Images</Label>
            <RhfInputImage
              path={`report-images/${surveyId}/components/${formValues.component.id}`}
              rhfProps={{
                name: "images",
                control: control as any,
              }}
              maxNumberOfFiles={5}
            />
          </div>
        </FormSection>
        <Button type="submit" className="w-full">
          Save
        </Button>
      </form>
    </FormProvider>
  );
}


interface DraggableConditionsProps {
  conditions: Phrase[];
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function DraggableConditions({
  conditions,
  setValue,
}: DraggableConditionsProps) {
  const [phrasesHydrated, phrases] = phraseStore.useList();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedConditions = Array.from(conditions);
    const [removed] = reorderedConditions.splice(result.source.index, 1);
    reorderedConditions.splice(result.destination.index, 0, removed);

    setValue('conditions', reorderedConditions, { shouldDirty: true });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="conditions">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-2"
          >
            {conditions.map((condition, index) => {
              const phrase = phrases.find((p) => p.id === condition.id);
              return (
                <Draggable
                  key={condition.id}
                  draggableId={condition.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="space-y-2 border-b border-gray-200 p-4 text-xs bg-white rounded-md shadow-sm hover:shadow-md transition-shadow cursor-move"
                    >
                      <p>{phrase?.phrase}</p>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}