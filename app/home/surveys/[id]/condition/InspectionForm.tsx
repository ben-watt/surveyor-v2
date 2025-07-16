import React, { useEffect, useMemo } from "react";
import {
  useForm,
  FormProvider,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { FormSection } from "@/app/home/components/FormSection";
import { merge } from "lodash";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from "uuid";
import {
  componentStore,
  elementStore,
  phraseStore,
  surveyStore,
  sectionStore,
} from "@/app/home/clients/Database";
import TextAreaInput from "@/app/home/components/Input/TextAreaInput";
import { Combobox } from "@/app/home/components/Input/ComboBox";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import toast from "react-hot-toast";

import { Edit, PenLine, X } from "lucide-react";
import ElementForm from "./ElementForm";
import { Skeleton } from "@/components/ui/skeleton";
import { DataForm as ElementDataForm } from "@/app/home/elements/form";
import { DataForm as ComponentDataForm } from "@/app/home/building-components/form";
import { DataForm as PhraseDataForm } from "@/app/home/conditions/form";
import Input from "@/app/home/components/Input/InputText";
import {
  addOrUpdateComponent,
  findComponent,
} from "@/app/home/surveys/building-survey-reports/Survey";
import { DraggableConditions } from "./DraggableConditions";
import {
  FormPhrase,
  InspectionFormData,
  InspectionFormProps,
  RAG_OPTIONS,
} from "./types";
import InputMoney from "@/app/home/components/Input/InputMoney";
import { useAutoSaveFormWithImages } from "@/app/home/hooks/useAutoSaveFormWithImages";
import { LastSavedIndicatorWithUploads } from "@/app/home/components/LastSavedIndicatorWithUploads";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage/RhfDropZoneInputImage";

function CostingsFieldArray() {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "costings",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="border rounded-md p-2">
          <div className="flex items-end justify-between relative">
          <InputMoney
            name={`costings.${index}.cost`}
            control={control}
            labelTitle="Cost"
            rules={{ required: "Amount is required" }}
          />
            <Button
              className="absolute top-0 right-0"
              type="button"
              variant="ghost"
              onClick={() => remove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Input
              labelTitle="Reason"
              placeholder="Description of the cost"
              register={() =>
                register(`costings.${index}.description` as const, {
                  required: true,
                  validate: (value) => value.length > 0,
                })
              }
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => append({ cost: 0, description: "" })}
      >
        Add Costing
      </Button>
    </div>
  );
}

// Data loading wrapper component
export default function InspectionFormWrapper({
  surveyId,
  componentId,
  defaultValues,
}: InspectionFormProps) {
  const [componentsHydrated, components] = componentStore.useList();
  const [elementsHydrated, elements] = elementStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();
  const [isHydrated, survey] = surveyStore.useGet(surveyId);
  const [surveySectionsHydrated, surveySections] = sectionStore.useList();

  // Wait for all data to be hydrated
  if (
    !isHydrated ||
    !componentsHydrated ||
    !elementsHydrated ||
    !phrasesHydrated ||
    !surveySectionsHydrated
  ) {
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

  // If we have a componentId, find the existing data
  let initialValues: InspectionFormData | undefined;
  if (componentId && survey) {
    const { component, elementSection, section } = findComponent(
      survey,
      componentId
    );
    if (component && elementSection && section) {
      initialValues = {
        inspectionId: component.inspectionId || uuidv4(),
        location: component.location || "",
        surveySection: { id: section.id, name: section.name },
        element: { id: elementSection.id, name: elementSection.name },
        component: { id: component.id, name: component.name },
        nameOverride: component.nameOverride || component.name,
        useNameOverride: component.useNameOverride || false,
        ragStatus: component.ragStatus,
        conditions: component.conditions || [],
        additionalDescription: component.additionalDescription || "",
        images: component.images || [],
        costings: component.costings || [],
      };
    }
  }

  // Merge with any provided default values
  const mergedValues = merge(
    {},
    {
      inspectionId: uuidv4(),
      location: "",
      surveySection: { id: "", name: "" },
      element: { id: "", name: "" },
      component: { id: "", name: "" },
      nameOverride: "",
      useNameOverride: false,
      additionalDescription: "",
      images: [],
      ragStatus: "N/I",
      conditions: [],
      costings: [],
    },
    initialValues,
    defaultValues
  );

  return (
    <InspectionFormContent
      surveyId={surveyId}
      level={survey?.reportDetails?.level || ""}
      initialValues={mergedValues}
      components={components}
      elements={elements}
      phrases={phrases}
      surveySections={surveySections}
    />
  );
}

// The actual form component
function InspectionFormContent({
  surveyId,
  level,
  initialValues,
  components,
  elements,
  phrases,
  surveySections,
}: {
  surveyId: string;
  level: string;
  initialValues: InspectionFormData;
  components: any[];
  elements: any[];
  phrases: any[];
  surveySections: any[];
}) {
  const drawer = useDynamicDrawer();
  const methods = useForm<InspectionFormData>({ defaultValues: initialValues });
  const {
    register,
    watch,
    setValue,
    control,
    getValues,
    trigger,
    formState: { errors },
  } = methods;

  // Only watch specific fields we need
  const surveySection = watch("surveySection");
  const element = watch("element");
  const component = watch("component");
  const useNameOverride = watch("useNameOverride");
  const conditions = watch("conditions");

  
  console.log("[InspectionForm] Component:", component);

  // Memoized options for select fields
  const surveySectionOptions = useMemo(() => {
    return surveySections.map((section) => ({
      value: { id: section.id, name: section.name },
      label: section.name,
    }));
  }, [surveySections]);

  const elementOptions = useMemo(
    () =>
      elements
        .filter(
          (element) =>
            !surveySection.id || element.sectionId === surveySection.id
        )
        .map((element) => ({
          value: { id: element.id, name: element.name },
          label: element.name,
        })),
    [elements, surveySection.id]
  );

  const componentOptions = useMemo(
    () =>
      components
        .filter((component) => component.elementId === element.id)
        .map((component) => ({
          value: { id: component.id, name: component.name },
          label: component.name,
        })),
    [components, element.id]
  );

  const phrasesOptions = useMemo(
    (): { value: FormPhrase; label: string }[] =>
      phrases
        .filter(
          (phrase) =>
            phrase.type.toLowerCase() === "condition" &&
            (phrase.associatedComponentIds.includes(component.id) ||
              phrase.associatedElementIds.includes(element.id))
        )
        .map((phrase) => ({
          value: {
            id: phrase.id,
            name: phrase.name,
            phrase: phrase.phrase,
          },
          label: phrase.name,
        })),
    [phrases, component.id, element.id]
  );

  // Reset dependent fields when parent fields change
  useEffect(() => {
    const elementExists = elements.some(
      (e) => e.id === element.id && e.sectionId === surveySection.id
    );

    if (surveySection.id && !elementExists && element.id) {
      setValue("element", { id: "", name: "" });
      setValue("component", { id: "", name: "" });
    }
  }, [surveySection.id, element.id, setValue, elements]);

  useEffect(() => {
    const componentExists = components.some(
      (c) => c.id === component.id && c.elementId === element.id
    );

    if (element && !componentExists && component.id) {
      setValue("component", { id: "", name: "" });
      setValue("conditions", []);
    }
  }, [element, component.id, components, setValue]);

  useEffect(() => {
    if (element.id) {
      const selectedElement = elements.find((e) => e.id === element.id);
      if (selectedElement) {
        setValue("surveySection", {
          id: selectedElement.sectionId,
          name:
            surveySections.find((s) => s.id === selectedElement.sectionId)
              ?.name || "",
        });
      }
    }
  }, [element.id, elements, surveySections, setValue]);

  // Memoize the image upload path
  const imageUploadPath = useMemo(() => {
    return `report-images/${surveyId}/inspections/${initialValues.inspectionId}`;
  }, [surveyId, initialValues.inspectionId]);

  const saveData = async (data: InspectionFormData, { auto = false } = {}) => {
    console.debug("[InspectionForm] saveData:", { data, auto });
    
    try {
      await surveyStore.update(surveyId, (survey) => {
        return addOrUpdateComponent(
          survey,
          data.surveySection.id,
          data.element.id,
          {
            id: data.component.id,
            inspectionId: data.inspectionId,
            name: data.component.name,
            nameOverride: data.nameOverride,
            useNameOverride: data.useNameOverride,
            location: data.location,
            additionalDescription: data.additionalDescription,
            images: data.images,
            conditions: data.conditions.map((x) => ({
              id: x.id,
              name: x.name,
              phrase: x.phrase || "",
            })),
            ragStatus: data.ragStatus,
            costings: data.costings.map((x) => ({
              cost: x.cost,
              description: x.description,
            })),
          }
        );
      });

      if (!auto) {
        // For manual saves, close drawer and show toast
        toast.success("Changes saved successfully");
        drawer.closeDrawer();
      }
    } catch (error) {
      console.error("[InspectionForm] Save failed", error);
      
      if (!auto) {
        toast.error("Failed to save changes");
      }
      
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, isUploading, lastSavedAt } = useAutoSaveFormWithImages(
    saveData,
    watch,
    getValues,
    trigger,
    {
      delay: 1500,
      enabled: !!surveyId && !!initialValues.inspectionId,
      imagePaths: [imageUploadPath]
    }
  );

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <FormSection title="Basic Information">
          <Combobox
            labelTitle="Survey Section"
            data={surveySectionOptions}
            name="surveySection"
            control={control}
            errors={errors}
            rules={{ validate: (value) => value.id !== "" || "Survey section is required" }}
          />
          <div className="flex items-end gap-2 justify-between">
            <Combobox
              labelTitle="Element"
              data={elementOptions}
              name="element"
              control={control}
              errors={errors}
              onCreateNew={() => {
                drawer.openDrawer({
                  id: surveyId + "/element",
                  title: "Create a new element",
                  description: "Create a new element for any survey",
                  content: <ElementDataForm />,
                });
              }}
              rules={{ validate: (value) => value.id !== "" || "Element is required" }}
            />
            <Button
              className="flex-none"
              variant="outline"
              disabled={!element.id}
              onClick={(e) => {
                e.preventDefault();
                drawer.openDrawer({
                  id: surveyId + "/element",
                  title: `Edit Element - ${element.name}`,
                  description: `Edit the ${element.name} element for survey`,
                  content: (
                    <ElementForm
                      surveyId={surveyId}
                      sectionId={surveySection.id}
                      elementId={element.id}
                    />
                  ),
                });
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
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
                  id: surveyId + "/component",
                  title: "Create a new component",
                  description: "Create a new component for any element",
                  content: (
                    <ComponentDataForm
                      defaultValues={{ elementId: element.id }}
                    />
                  ),
                });
              }}
              rules={{ required: true }}
            />
            <Button
              className="flex-none"
              variant="outline"
              disabled={!component.name}
              onClick={(e) => {
                e.preventDefault();
                setValue("useNameOverride", !useNameOverride, {
                  shouldValidate: true,
                });
              }}
            >
              <PenLine className="w-4 h-4" />
            </Button>
          </div>

          {useNameOverride && component.id && (
            <Input
              type="text"
              labelTitle="Component Name Override"
              register={() => register("nameOverride", { required: true })}
              errors={errors}
              placeholder="Enter custom component name"
            />
          )}

          <Combobox
            labelTitle="RAG Status"
            data={RAG_OPTIONS.map((x) => ({
              value: x.value,
              label: x.label,
            }))}
            name="ragStatus"
            control={control}
            errors={errors}
            rules={{ required: "RAG status is required" }}
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
                id: surveyId + "/condition",
                title: "Create a new condition phrase",
                description: "Create a new condition phrase for any surveys",
                content: (
                  <PhraseDataForm
                    onSave={() => drawer.closeDrawer()}
                    defaultValues={{
                      type: "Condition",
                      associatedComponentIds: [component.id],
                      associatedElementIds: [element.id],
                    }}
                  />
                ),
              });
            }}
          />

          {Array.isArray(conditions) && (
            <DraggableConditions
              conditions={conditions}
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

          <div className="space-y-2 image-w-50">
            <RhfDropZoneInputImage
              path={imageUploadPath}
              rhfProps={{
                name: "images",
              }}
              labelText="Images"
              maxFiles={20}
              minFiles={1}
              features={{
                archive: true,
                metadata: true,
              }}
            />
          </div>
        </FormSection>
        {level === "3" && (
          <FormSection title="Costings">
            <CostingsFieldArray />
          </FormSection>
        )}
        <LastSavedIndicatorWithUploads
          status={saveStatus}
          isUploading={isUploading}
          lastSavedAt={lastSavedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}
