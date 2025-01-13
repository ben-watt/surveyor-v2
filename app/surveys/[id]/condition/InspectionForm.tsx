import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import Input from "@/app/components/Input/InputText";
import { FormSection } from "@/app/components/FormSection";
import { RagStatus, Component, Defect } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { componentStore } from "@/app/clients/Database";
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

  const componentOptions = components.map(component => ({
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
          />
          <Input
            labelTitle="Element"
            register={() => register("element")}
            placeholder="Enter element"
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
                control
              }}
              maxNumberOfFiles={5}
            />
          </div>
        </FormSection>

        <FormSection title="RAG Status">
          <select
            {...register("ragStatus")}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="Red">Red</option>
            <option value="Amber">Amber</option>
            <option value="Green">Green</option>
            <option value="N/I">Not Inspected</option>
          </select>
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
