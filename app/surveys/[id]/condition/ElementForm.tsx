import React, { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { FormSection } from "@/app/components/FormSection";
import { ElementSection } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { surveyStore } from "@/app/clients/Database";
import { RhfInputImage } from "@/app/components/Input/InputImage";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { useDynamicDrawer } from "@/app/components/Drawer";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import InspectionForm from "./InspectionForm";
import { Clipboard, Edit } from "lucide-react";

type ElementFormData = {
  description: string;
  images: string[];
}

interface ElementFormProps {
  surveyId: string;
  sectionName: string;
  elementId: string;
}

export default function ElementForm({ surveyId, sectionName, elementId }: ElementFormProps) {  
  console.debug("[ElementForm] props", surveyId, sectionName, elementId);

  const drawer = useDynamicDrawer();
  const [isLoading, setIsLoading] = React.useState(true);
  const defaultValues: ElementFormData = {
    description: "",
    images: [],
  };

  const methods = useForm<ElementFormData>({ defaultValues });
  const { register, control, handleSubmit, reset } = methods;

  const [elementData, setElementData] = React.useState<ElementSection | null>(null);

  useEffect(() => {
    const loadElementData = async () => {
      try {
        const survey = await surveyStore.get(surveyId);

        console.debug("[ElementForm] survey", survey);
        const surveySection = survey.content.sections.find(section => section.name === sectionName);

        console.debug("[ElementForm] surveySection", surveySection);
        const elementSection = surveySection?.elementSections.find(
          (element: ElementSection) => element.id === elementId
        );

        console.debug("[ElementForm] elementSection", elementSection);

        if (elementSection) {
          setElementData(elementSection);
          reset({
            description: elementSection.description || "",
            images: elementSection.images || [],
          });
        }
      } catch (error) {
        toast.error("Failed to load element details");
      } finally {
        setIsLoading(false);
      }
    };

    loadElementData();
  }, [surveyId, sectionName, elementId, reset]);

  const onValid = async (data: ElementFormData) => {
    await surveyStore.update(surveyId, (survey) => {
      const surveySection = survey.content.sections.find(section => section.name === sectionName);
      if (!surveySection) return survey;

      const elementSection = surveySection.elementSections.find(
        (element: ElementSection) => element.id === elementId
      );
      if (!elementSection) return survey;

      elementSection.description = data.description;
      elementSection.images = data.images;

      return survey;
    });

    drawer.closeDrawer();
    toast.success("Element details saved");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <FormSection title="Element Details">
          <Skeleton className="w-full h-32" />
          <div className="space-y-2">
            <Label>Images</Label>
            <Skeleton className="w-full h-40" />
          </div>
        </FormSection>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValid)} className="space-y-6">
        <FormSection title="Element Details">
          <TextAreaInput
            labelTitle="Description"
            register={() => register("description")}
            placeholder="Enter element description"
          />
          <div className="space-y-2">
            <Label>Images</Label>
            <RhfInputImage
              path={`report-images/${surveyId}/elements/${elementId}`}
              rhfProps={{
                name: "images",
                control: control as any
              }}
              maxNumberOfFiles={5}
            />
          </div>
        </FormSection>

        <FormSection title="Components">
          <div className="space-y-4">
            {elementData?.components.map((component) => (
              <div key={component.id} className="flex items-center justify-between p-1 pl-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-sm ${
                    component.ragStatus === "Red" ? "bg-red-500" :
                    component.ragStatus === "Amber" ? "bg-amber-500" :
                    component.ragStatus === "Green" ? "bg-green-500" :
                    "bg-gray-500"
                  }`} />
                  <span>{component.name}</span>
                </div>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    drawer.openDrawer({
                      title: `Inspect Component - ${component.name}`,
                      description: `Inspect the ${component.name} component`,
                      content: <InspectionForm
                        surveyId={surveyId}
                        componentId={component.id}
                      />
                    });
                  }}
                >
                  <Edit  className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {(!elementData?.components || elementData.components.length === 0) && (
              <div className="text-center text-gray-500 py-4">
                No components added yet.
              </div>
            )}
          </div>
        </FormSection>
        <Button type="submit" className="w-full">
          Save Element Details
        </Button>
      </form>
    </FormProvider>
  );
}
