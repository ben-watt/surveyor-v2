import React from "react";
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

  const onSubmit = (data: InspectionFormData) => {
    console.log(data);
  };

  const selectedDefects = watch("defects");
  const selectedSurveySection = watch("surveySection");

  const handleDefectToggle = (defect: typeof MOCK_DEFECTS[number]) => {
    const current = selectedDefects;
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

  const elementOptions = elements
    .filter(element => !selectedSurveySection || element.section === selectedSurveySection)
    .map(element => ({
      value: element.id,
      label: element.name
    }));

  const componentOptions = components
    .filter(component => component.elementId === watch("element"))
    .map(component => ({
      value: component.id,
      label: component.name
    }));

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Basic Information">
          <Input
            labelTitle="Location"
            register={() => register("location")}
            placeholder="Enter location"
          />
          <Combobox
            labelTitle="Survey Section"
            data={surveySectionOptions}
            name="surveySection"
            control={control}
            errors={errors}
            onChange={() => {
              // Reset element and component when section changes
              setValue("element", "");
              setValue("component", {
                id: "",
                name: "",
                defects: [],
                ragStatus: "N/I",
                useNameOveride: false,
              });
            }}
          />
          <Combobox
            labelTitle="Element"
            data={elementOptions}
            name="element"
            control={control}
            errors={errors}
            onChange={(value) => {
              const element = elements.find(e => e.id === value);
              if (element) {
                // Reset component when element changes
                setValue("component", {
                  id: "",
                  name: "",
                  defects: [],
                  ragStatus: "N/I",
                  useNameOveride: false,
                });
              }
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
        </FormSection>

        <FormSection title="RAG Status">
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
                  checked={selectedDefects.some((d) => d.name === defect.name)}
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
