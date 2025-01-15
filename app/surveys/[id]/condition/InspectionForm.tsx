import React, { useEffect, useMemo } from "react";
import { useForm, FormProvider, FieldErrors } from "react-hook-form";
import { FormSection } from "@/app/components/FormSection";
import { RagStatus, Component, ElementSection } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { componentStore, elementStore, phraseStore, surveyStore } from "@/app/clients/Database";
import { RhfInputImage } from "@/app/components/Input/InputImage";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import surveySections from "@/app/settings/surveySections.json";
import { Combobox } from "@/app/components/Input/ComboBox";
import { useDynamicDrawer } from "@/app/components/Drawer";
import toast from "react-hot-toast";

const LOCATION_OPTIONS = [
  {
    value: "exterior",
    label: "Exterior",
    children: [
      {
        value: "front",
        label: "Front Elevation",
        children: [
          { value: "front-wall", label: "Front Wall" },
          { value: "front-windows", label: "Front Windows" },
          { value: "front-door", label: "Front Door" },
          { value: "front-roof", label: "Front Roof Line" }
        ]
      },
      {
        value: "rear",
        label: "Rear Elevation",
        children: [
          { value: "rear-wall", label: "Rear Wall" },
          { value: "rear-windows", label: "Rear Windows" },
          { value: "rear-door", label: "Rear Door" },
          { value: "rear-roof", label: "Rear Roof Line" }
        ]
      },
      {
        value: "sides",
        label: "Side Elevations",
        children: [
          {
            value: "left-side",
            label: "Left Side",
            children: [
              { value: "left-wall", label: "Left Wall" },
              { value: "left-windows", label: "Left Windows" }
            ]
          },
          {
            value: "right-side",
            label: "Right Side",
            children: [
              { value: "right-wall", label: "Right Wall" },
              { value: "right-windows", label: "Right Windows" }
            ]
          }
        ]
      }
    ]
  },
  {
    value: "interior",
    label: "Interior",
    children: [
      {
        value: "ground-floor",
        label: "Ground Floor",
        children: [
          {
            value: "living-areas",
            label: "Living Areas",
            children: [
              { value: "living-room", label: "Living Room" },
              { value: "dining-room", label: "Dining Room" },
              { value: "kitchen", label: "Kitchen" }
            ]
          },
          {
            value: "utility",
            label: "Utility Areas",
            children: [
              { value: "hallway", label: "Hallway" },
              { value: "wc", label: "WC" },
              { value: "storage", label: "Storage" }
            ]
          }
        ]
      },
      {
        value: "first-floor",
        label: "First Floor",
        children: [
          {
            value: "bedrooms",
            label: "Bedrooms",
            children: [
              { value: "master-bedroom", label: "Master Bedroom" },
              { value: "bedroom-2", label: "Bedroom 2" },
              { value: "bedroom-3", label: "Bedroom 3" }
            ]
          },
          {
            value: "bathrooms",
            label: "Bathrooms",
            children: [
              { value: "main-bathroom", label: "Main Bathroom" },
              { value: "en-suite", label: "En-suite" }
            ]
          },
          { value: "landing", label: "Landing" }
        ]
      },
      {
        value: "loft",
        label: "Loft",
        children: [
          { value: "loft-space", label: "Loft Space" },
          { value: "loft-access", label: "Loft Access" }
        ]
      }
    ]
  }
];

const RAG_OPTIONS = [
  { value: "Red", label: "Red" },
  { value: "Amber", label: "Amber" },
  { value: "Green", label: "Green" },
  { value: "N/I", label: "Not Inspected" }
];

type InspectionFormData = {
  location: string;
  surveySection: string;
  element: {
    id: string;
    name: string;
  };
  component: Component;
  additionalDescription: string;
  images: string[];
  ragStatus: RagStatus;
  defects: {
    id: string;
    name: string;
    phrase: string;
  }[];
  conditions: {
    id: string;
    name: string;
    phrase: string;
  }[];
}

interface InspectionFormProps {
  surveyId: string;
}

export default function InspectionForm({ surveyId }: InspectionFormProps) {
  const [isHydrated, components] = componentStore.useList();
  const [elementsHydrated, elements] = elementStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();

  const drawer = useDynamicDrawer();
  const defaultValues : InspectionFormData = {
    location: "",
    surveySection: "",
    element: {
      id: "",
      name: ""
    },
    component: {
      id: "",
      name: "",
      defects: [],
      conditions: [],
      ragStatus: "N/I",
      useNameOveride: false,
    },
    additionalDescription: "",
    images: [],
    ragStatus: "N/I",
    defects: [],
    conditions: [],
  };

  const methods = useForm<InspectionFormData>({ defaultValues });

  const { register, watch, setValue, handleSubmit, control, formState: { errors } } = methods;
  const formValues = watch();

  // Memoize the filtered elements based on selected survey section
  const elementOptions = useMemo(() => {
    const filteredElements = elements.filter(
      element => !formValues.surveySection || element.section === formValues.surveySection
    );
    return filteredElements.map(element => ({
      value: { id: element.id, name: element.name },
      label: element.name
    }));
  }, [elements, formValues.surveySection]);

  // Memoize the filtered components based on selected element
  const componentOptions = useMemo(() => {
    const filteredComponents = components.filter(
      component => component.elementId === formValues.element.id
    );
    return filteredComponents.map(component => ({
      value: component.id,
      label: component.name
    }));
  }, [components, formValues.element]);

  // Memoize the filtered phrases for conditions and defects
  const conditionOptions = useMemo(() => {
    const filteredPhrases = phrases.filter(
      phrase => phrase.type === "Condition" 
      && phrase.associatedComponentIds.includes(formValues.component.id));
    return filteredPhrases.map(phrase => ({
      value: phrase.id,
      label: phrase.name
    }));
  }, [phrases, formValues.component.id]);
  
  const defectOptions = useMemo(() => {
    const filteredPhrases = phrases.filter(phrase => phrase.type === "Defect" 
      && phrase.associatedComponentIds.includes(formValues.component.id));
    return filteredPhrases.map(phrase => ({
      value: phrase.id,
      label: phrase.name
    }));
  }, [formValues.component.id, phrases]);

  // Reset dependent fields when survey section changes
  useEffect(() => {
    const elementExists = elements.some(
      e => e.id === formValues.element.id && e.section === formValues.surveySection
    );
    
    if (formValues.surveySection && !elementExists && formValues.element.id) {
      setValue("element", defaultValues.element, { shouldDirty: false });
      setValue("component", defaultValues.component, { shouldDirty: false });
    }
  }, [formValues.surveySection, formValues.element.id, setValue, defaultValues.element, defaultValues.component, elements]);

  // Reset component when element changes
  useEffect(() => {
    const componentExists = components.some(
      c => c.id === formValues.component.id && c.elementId === formValues.element.id
    );
    
    if (formValues.element && !componentExists && formValues.component.id) {
      setValue("component", defaultValues.component);
    }
  }, [formValues.element, formValues.component.id, components, setValue, defaultValues.component]);

  const onValid = async (data: InspectionFormData) => {
    await surveyStore.update(surveyId, (survey) => {
      let surveySection = survey.content.sections.find(section => section.name === data.surveySection);
      if (!surveySection) {
        surveySection = {
          name: data.surveySection,
          elementSections: []
        };
        survey.content.sections.push(surveySection);
      }

      let elementSection = surveySection.elementSections.find(
        (element: ElementSection) => element.name === data.element.id
      );
      if (!elementSection) {
        elementSection = {
          name: data.element.name,
          components: [],
          id: crypto.randomUUID(),
          isPartOfSurvey: true,
          description: "",
          images: []
        } as ElementSection;
        surveySection.elementSections.push(elementSection);
      }

      if (elementSection) {
        const existingComponent = elementSection.components.find(
          (component: Component) => component.id === data.component.id
        );
        if (existingComponent) {
          Object.assign(existingComponent, {
            ...data.component,
            ragStatus: data.ragStatus,
            conditions: (data.conditions || []).map(p => ({
              id: p.id,
              name: p.name,
              phrase: p.phrase || ""
            })),
            defects: (data.defects || []).map(p => ({
              id: p.id,
              name: p.name,
              phrase: p.phrase || ""
            }))
          });
        } else {
          elementSection.components.push({
            id: data.component.id,
            name: data.component.name,
            conditions: (data.conditions || []).map(p => ({
              id: p.id,
              name: p.name,
              phrase: p.phrase || "",
              description: ""
            })),
            defects: (data.defects || []).map(p => ({
              id: p.id,
              name: p.name,
              phrase: p.phrase || "",
              description: ""
            })),
            ragStatus: data.ragStatus,
            useNameOveride: false,
          });
        }
      }

      return survey;
    });

    drawer.closeDrawer();
    toast.success("Inspection saved");
  };

  const onInvalid = (errors: FieldErrors<InspectionFormData>) => {
    console.log(errors);
  };

  const surveySectionOptions = surveySections.map(section => ({
    value: section.name,
    label: section.name
  }));

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-6">
        <FormSection title="Basic Information">
          <Combobox
            labelTitle="Location"
            data={LOCATION_OPTIONS}
            name="location"
            control={control}
            errors={errors}
            showParentLabels={true}
            rules={{
              required: "Location is required"
            }}
          />
          <Combobox
            labelTitle="Survey Section"
            data={surveySectionOptions}
            name="surveySection"
            control={control}
            errors={errors}
            rules={{
              required: "Survey section is required"
            }}
          />
          <Combobox
            labelTitle="Element"
            data={elementOptions}
            name="element"
            control={control}
            errors={errors}
            rules={{
              required: "Element is required"
            }}
          />
          <Combobox
            labelTitle="Component"
            data={componentOptions}
            name="component.id"
            control={control}
            onChange={(value) => {
              const component = components.find(c => c.id === value);
              if (component) {
                setValue("component", {
                  id: component.id,
                  name: component.name,
                  defects: [],
                  ragStatus: "N/I",
                  useNameOveride: false,
                  conditions: [],
                });
              }
            }}
            errors={errors}
            rules={{
              required: "Component is required"
            }}
          />
        </FormSection>

        <FormSection title="Component Details">
          <Combobox
              labelTitle="RAG Status"
              data={RAG_OPTIONS}
              name="ragStatus"
              control={control}
              errors={errors}
              rules={{
                required: "RAG status is required"
              }}
            />
          <Combobox
              labelTitle="Condition"
              data={conditionOptions}
              name="conditions"
              control={control}
              errors={errors}
              isMulti={true}
            />
            {["Red", "Amber"].includes(watch("ragStatus")) && (
              <Combobox
                labelTitle="Defects"
                data={defectOptions}
                name="defects"
                control={control}
                errors={errors}
                isMulti={true}
                onChange={(value) => {
                  if(value && Array.isArray(value)) {
                    const defects = value
                      .map(v => {
                        const p = phrases.find(p => p.id === v);
                        return p ? {
                          id: p.id,
                          name: p.name,
                          phrase: p.phrase || ""
                        } : undefined;
                      })
                      .filter((p): p is { id: string; name: string; phrase: string } => p !== undefined);
                    setValue("defects", defects);
                  }
                }}
            />
            )}
            {
              Array.isArray(formValues.defects) && formValues.defects.map((defect) => {
                const phrase = phrases.find(p => p.id === defect.id);
                return (
                  <div key={defect.id} className="space-y-2 border-b border-gray-200 p-4 text-xs">
                    <p>{phrase?.phrase}</p>
                  </div>
                );
              })
            }
          <TextAreaInput
            labelTitle="Additional Description"
            register={() => register("additionalDescription")}
            placeholder="Enter component description"
          />
          <div className="space-y-2">
            <Label>Images</Label>
            <RhfInputImage
              path="inspections/"
              rhfProps={{
                name: "images",
                control: control as any
              }}
              maxNumberOfFiles={5}
            />
          </div>
        </FormSection>
        <Button type="submit" className="w-full">
          Save Inspection
        </Button>
      </form>
    </FormProvider>
  );
}
