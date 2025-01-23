import React, { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { FormSection } from "@/app/components/FormSection";
import { merge } from "lodash";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  componentStore,
  elementStore,
  phraseStore,
  surveyStore,
  sectionStore,
} from "@/app/clients/Database";
import { RhfInputImage } from "@/app/components/Input/InputImage";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { Combobox } from "@/app/components/Input/ComboBox";
import { useDynamicDrawer } from "@/app/components/Drawer";
import toast from "react-hot-toast";
import { Edit, PenLine } from "lucide-react";
import ElementForm from "./ElementForm";
import { Skeleton } from "@/components/ui/skeleton";
import { DataForm as ElementDataForm } from "@/app/elements/form";
import { DataForm as ComponentDataForm } from "@/app/building-components/form";
import { DataForm as PhraseDataForm } from "@/app/conditions/form";
import Input from "@/app/components/Input/InputText";
import { addOrUpdateComponent, findComponent } from "@/app/surveys/building-survey-reports/Survey";



import { DraggableConditions } from "./DraggableConditions";
import { FormPhrase, InspectionFormData, InspectionFormProps, RAG_OPTIONS } from "./types";

export default function InspectionForm({
  surveyId,
  componentId,
  defaultValues,
}: InspectionFormProps) {
  const [componentsHydrated, components] = componentStore.useList();
  const [elementsHydrated, elements] = elementStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();
  const [isHydrated, survey] = surveyStore.useGet(surveyId);
  const [surveySectionsHydrated, surveySections] = sectionStore.useList();

  const drawer = useDynamicDrawer();
  const [showNameOverride, setShowNameOverride] = useState(false);

  const initialValues = useMemo(() => {
    const baseValues: InspectionFormData = {
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
    };

    return merge({}, baseValues, defaultValues);
  }, [defaultValues]);

  const methods = useForm<InspectionFormData>({ defaultValues: initialValues });
  const { reset, register, watch, setValue, handleSubmit, control, formState: { errors } } = methods;

  // Load existing component data if componentId is provided
  useEffect(() => {
    if (!isHydrated || !componentId || !survey) return;

    const { component, elementSection, section } = findComponent(survey, componentId);
    if (!component || !elementSection || !section) return;

    reset({
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
    });
  }, [isHydrated, survey, componentId, reset]);

  const formValues = watch();

  // Memoized options for select fields
  const surveySectionOptions = useMemo(() => {
    // Always show all sections
    return surveySections.map(section => ({
      value: { id: section.id, name: section.name },
      label: section.name,
    }));
  }, [surveySections]);

  // Filter elements based on selected section
  const elementOptions = useMemo(() => 
    elements
      .filter(element => !formValues.surveySection.id || element.sectionId === formValues.surveySection.id)
      .map(element => ({
        value: { id: element.id, name: element.name },
        label: element.name,
      })), 
    [elements, formValues.surveySection.id]
  );

  const componentOptions = useMemo(() => 
    components
      .filter(component => component.elementId === formValues.element.id)
      .map(component => ({
        value: { id: component.id, name: component.name },
        label: component.name,
      })),
    [components, formValues.element.id]
  );

  const phrasesOptions = useMemo((): { value: FormPhrase, label: string }[] => 
    phrases
      .filter(phrase => 
        phrase.type === "Condition" && 
        (phrase.associatedComponentIds.includes(formValues.component.id) ||
         phrase.associatedElementIds.includes(formValues.element.id))
      )
      .map(phrase => ({
        value: {
          id: phrase.id,
          name: phrase.name,
          phrase: phrase.phrase,
        },
        label: phrase.name,
      })),
    [phrases, formValues.component.id, formValues.element.id]
  );

  // Reset dependent fields when parent fields change
  useEffect(() => {
    const elementExists = elements.some(
      e => e.id === formValues.element.id && e.sectionId === formValues.surveySection.id
    );

    if (formValues.surveySection.id && !elementExists && formValues.element.id) {
      setValue("element", { id: "", name: "" });
      setValue("component", { id: "", name: "" });
    }
  }, [formValues.surveySection.id, formValues.element.id, setValue, elements]);

  useEffect(() => {
    const componentExists = components.some(
      c => c.id === formValues.component.id && c.elementId === formValues.element.id
    );

    if (formValues.element && !componentExists && formValues.component.id) {
      setValue("component", { id: "", name: "" });
      setValue("conditions", []);
    }
  }, [formValues.element, formValues.component.id, components, setValue]);

  useEffect(() => {
    if (!formValues.component.id) {
      setShowNameOverride(false);
      setValue("conditions", []);
    } else if (showNameOverride) {
      setValue("nameOverride", formValues.component.name);
    }
  }, [formValues.component.id, formValues.component.name, showNameOverride, setValue]);

  useEffect(() => {
    if (formValues.element.id) {
      const selectedElement = elements.find(e => e.id === formValues.element.id);
      if (selectedElement) {
        setValue("surveySection", {
          id: selectedElement.sectionId,
          name: surveySections.find(s => s.id === selectedElement.sectionId)?.name || "",
        });
      }
    }
  }, [formValues.element.id, elements, surveySections, setValue]);

  const onSubmit = async (data: InspectionFormData) => {
    await surveyStore.update(surveyId, (survey) => {
      return addOrUpdateComponent(
        survey,
        data.surveySection.id,
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
          conditions: data.conditions.map(x => ({
            id: x.id,
            name: x.name,
            phrase: x.phrase || "",
          })),
          ragStatus: data.ragStatus,
        }
      );
    });

    drawer.closeDrawer();
    toast.success("Inspection saved");
  };

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Basic Information">
          <Combobox
            labelTitle="Survey Section"
            data={surveySectionOptions}
            name="surveySection"
            control={control}
            errors={errors}
            rules={{ required: "Survey section is required" }}
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
                  title: "Create a new element",
                  description: "Create a new element for any survey",
                  content: <ElementDataForm />,
                });
              }}
              rules={{ required: "Element is required" }}
            />
            <Button
              className="flex-none"
              variant="outline"
              disabled={!formValues.element.id}
              onClick={(e) => {
                e.preventDefault();
                drawer.openDrawer({
                  title: `Edit Element - ${formValues.element.name}`,
                  description: `Edit the ${formValues.element.name} element for survey`,
                  content: (
                    <ElementForm
                      surveyId={surveyId}
                      sectionId={formValues.surveySection.id}
                      elementId={formValues.element.id}
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
                  title: "Create a new component",
                  description: "Create a new component for any element",
                  content: (
                    <ComponentDataForm
                      defaultValues={{ elementId: formValues.element.id }}
                    />
                  ),
                });
              }}
              rules={{ required: true }}
            />
            <Button
              className="flex-none"
              variant="outline"
              disabled={!formValues.component.name}
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
            data={RAG_OPTIONS.map(x => ({
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
                title: "Create a new condition phrase",
                description: "Create a new condition phrase for any surveys",
                content: (
                  <PhraseDataForm
                    onSave={() => drawer.closeDrawer()}
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