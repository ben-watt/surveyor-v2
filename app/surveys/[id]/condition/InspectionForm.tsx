import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import Input from "@/app/components/Input/InputText";
import { FormSection } from "@/app/components/FormSection";
import { RagStatus, Component, Defect } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { componentStore } from "@/app/clients/Database";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Mock data for features and defects
const MOCK_FEATURES = [
  "Double Glazed",
  "Triple Glazed",
  "Toughened Glass",
  "Self-Cleaning",
  "UV Protection",
  "Low-E Coating",
  "Gas Filled",
  "Sound Insulation",
  "Security Glass",
  "Fire Resistant"
] as const;

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
  reportSection: string;
  element: string;
  component: Component;
  features: string[];
  ragStatus: RagStatus;
  defects: Defect[];
}

export default function InspectionForm() {
  const [isHydrated, components] = componentStore.useList();
  const [open, setOpen] = React.useState(false);

  const methods = useForm<InspectionFormData>({
    defaultValues: {
      location: "",
      reportSection: "",
      element: "",
      component: {
        id: "",
        name: "",
        defects: [],
        ragStatus: "N/I",
        useNameOveride: false,
      },
      features: [],
      ragStatus: "N/I",
      defects: [],
    },
  });

  const { register, watch, setValue, handleSubmit } = methods;

  const onSubmit = (data: InspectionFormData) => {
    console.log(data);
  };

  const selectedFeatures = watch("features");
  const selectedDefects = watch("defects");
  const selectedComponent = watch("component");

  const handleFeatureToggle = (feature: string) => {
    const current = selectedFeatures;
    if (current.includes(feature)) {
      setValue(
        "features",
        current.filter((f) => f !== feature)
      );
    } else {
      setValue("features", [...current, feature]);
    }
  };

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

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Basic Information">
          <Input
            labelTitle="Location"
            register={() => register("location")}
            placeholder="Enter location"
          />
          <Input
            labelTitle="Report Section"
            register={() => register("reportSection")}
            placeholder="Enter report section"
          />
          <Input
            labelTitle="Element"
            register={() => register("element")}
            placeholder="Enter element"
          />
          
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedComponent.name
                  ? components.find((component) => component.id === selectedComponent.id)?.name
                  : "Select component..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search components..." />
                <CommandEmpty>No component found.</CommandEmpty>
                <CommandGroup>
                  {components.map((component) => (
                    <CommandItem
                      key={component.id}
                      value={component.id}
                      onSelect={() => {
                        //setValue("component", component);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedComponent.id === component.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {component.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </FormSection>

        <FormSection title="Features">
          <div className="grid grid-cols-2 gap-4">
            {MOCK_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center space-x-2">
                <Checkbox
                  id={`feature-${feature}`}
                  checked={selectedFeatures.includes(feature)}
                  onCheckedChange={() => handleFeatureToggle(feature)}
                />
                <Label
                  htmlFor={`feature-${feature}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {feature}
                </Label>
              </div>
            ))}
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
