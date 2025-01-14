import React, { useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import Input from "@/app/components/Input/InputText";
import { FormSection } from "@/app/components/FormSection";
import { RagStatus, Component } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { componentStore, elementStore } from "@/app/clients/Database";
import { RhfInputImage } from "@/app/components/Input/InputImage";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import surveySections from "@/app/settings/surveySections.json";
import { Combobox } from "@/app/components/Input/ComboBox";
import { Phrase } from "@/app/clients/Dexie";

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
  element: string;
  component: Component;
  description: string;
  images: string[];
  ragStatus: RagStatus;
  defects: Phrase[];
  conditions: Phrase[];
}

export default function InspectionForm() {
  const [isHydrated, components] = componentStore.useList();
  const [elementsHydrated, elements] = elementStore.useList();

  const methods = useForm<InspectionFormData>({
    defaultValues: {
      location: "",
      surveySection: "",
      element: "",
      component: {
        id: "",
        name: "",
        defects: [],
        conditions: [],
        ragStatus: "N/I",
        useNameOveride: false,
      },
      description: "",
      images: [],
      ragStatus: "N/I",
    },
  });

  const { register, watch, setValue, handleSubmit, control, formState: { errors } } = methods;
  const formValues = watch();

  // Memoize the filtered elements based on selected survey section
  const elementOptions = useMemo(() => {
    const filteredElements = elements.filter(
      element => !formValues.surveySection || element.section === formValues.surveySection
    );
    return filteredElements.map(element => ({
      value: element.id,
      label: element.name
    }));
  }, [elements, formValues.surveySection]);

  // Memoize the filtered components based on selected element
  const componentOptions = useMemo(() => {
    const filteredComponents = components.filter(
      component => component.elementId === formValues.element
    );
    return filteredComponents.map(component => ({
      value: component.id,
      label: component.name
    }));
  }, [components, formValues.element]);

  // Reset dependent fields when survey section changes
  useEffect(() => {
    const elementExists = elements.some(
      e => e.id === formValues.element && e.section === formValues.surveySection
    );
    
    if (formValues.surveySection && !elementExists && formValues.element) {
      setValue("element", "");
      setValue("component", {
        id: "",
        name: "",
        defects: [],
        ragStatus: "N/I",
        useNameOveride: false,
        conditions: [],
      });
    }
  }, [formValues.surveySection, formValues.element, elements, setValue]);

  // Reset component when element changes
  useEffect(() => {
    const componentExists = components.some(
      c => c.id === formValues.component.id && c.elementId === formValues.element
    );
    
    if (formValues.element && !componentExists && formValues.component.id) {
      setValue("component", {
        id: "",
        name: "",
        defects: [],
        ragStatus: "N/I",
        useNameOveride: false,
        conditions: [],
      });
    }
  }, [formValues.element, formValues.component.id, components, setValue]);

  const onSubmit = (data: InspectionFormData) => {
    console.log(data);
  };

  const surveySectionOptions = surveySections.map(section => ({
    value: section.name,
    label: section.name
  }));

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Basic Information">
          <Combobox
            labelTitle="Location"
            data={LOCATION_OPTIONS}
            name="location"
            control={control}
            errors={errors}
            showParentLabels={true}
          />
          <Combobox
            labelTitle="Survey Section"
            data={surveySectionOptions}
            name="surveySection"
            control={control}
            errors={errors}
          />
          <Combobox
            labelTitle="Element"
            data={elementOptions}
            name="element"
            control={control}
            errors={errors}
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
          />
        </FormSection>

        <FormSection title="Component Details">
          <Combobox
              labelTitle="RAG Status"
              data={RAG_OPTIONS}
              name="ragStatus"
              control={control}
              errors={errors}
            />
          <Combobox
              labelTitle="Conditions"
              data={RAG_OPTIONS}
              name="conditions"
              control={control}
              errors={errors}
            />
            {["Red", "Amber"].includes(watch("ragStatus")) && (
              <Combobox
                labelTitle="Defects"
                data={RAG_OPTIONS}
                name="defects"
                control={control}
                errors={errors}
            />
            )}
          <TextAreaInput
            labelTitle="Description"
            register={() => register("description")}
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
