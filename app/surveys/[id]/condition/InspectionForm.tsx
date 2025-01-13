import React, { useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import Input from "@/app/components/Input/InputText";
import { FormSection } from "@/app/components/FormSection";
import { RagStatus, Component, Defect } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { componentStore, elementStore } from "@/app/clients/Database";
import { RhfInputImage } from "@/app/components/Input/InputImage";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import surveySections from "@/app/settings/surveySections.json";
import { Combobox } from "@/app/components/Input/ComboBox";

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

const MOCK_DEFECTS = [
  {
    name: "Condensation",
    description: "Moisture between glass panes indicating seal failure"
  },
  {
    name: "Cracked Glass",
    description: "Visible cracks or chips in the glass"
  },
  {
    name: "Failed Seal",
    description: "Deteriorated or damaged window seals"
  },
  {
    name: "Frame Damage",
    description: "Visible damage or rot in window frames"
  },
  {
    name: "Hardware Issues",
    description: "Problems with handles, locks, or hinges"
  },
  {
    name: "Drafts",
    description: "Air leakage around windows"
  }
] as const;

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
  defects: Defect[];
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
        ragStatus: "N/I",
        useNameOveride: false,
      },
      description: "",
      images: [],
      ragStatus: "N/I",
      defects: [],
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
      });
    }
  }, [formValues.element, formValues.component.id, components, setValue]);

  const onSubmit = (data: InspectionFormData) => {
    console.log(data);
  };

  const handleDefectToggle = (defect: typeof MOCK_DEFECTS[number]) => {
    const current = formValues.defects;
    const exists = current.some((d) => d.name === defect.name);
    
    if (exists) {
      setValue(
        "defects",
        current.filter((d) => d.name !== defect.name)
      );
    } else {
      setValue("defects", [
        ...current,
        {
          name: defect.name,
          description: defect.description,
          isChecked: true,
          material: [],
        },
      ]);
    }
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
                });
              }
            }}
            errors={errors}
          />
        </FormSection>

        <FormSection title="Component Details">
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
          <Combobox
            labelTitle="RAG Status"
            data={RAG_OPTIONS}
            name="ragStatus"
            control={control}
            errors={errors}
          />
        </FormSection>

        <FormSection title="Defects">
          <div className="space-y-4">
            {MOCK_DEFECTS.map((defect) => (
              <div
                key={defect.name}
                className="flex items-start space-x-2 border p-3 rounded-md"
              >
                <Checkbox
                  id={`defect-${defect.name}`}
                  checked={formValues.defects.some((d) => d.name === defect.name)}
                  onCheckedChange={() => handleDefectToggle(defect)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={`defect-${defect.name}`}
                    className="text-sm font-medium"
                  >
                    {defect.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {defect.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <Button type="submit" className="w-full">
          Save Inspection
        </Button>
      </form>
    </FormProvider>
  );
}
