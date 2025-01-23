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
import { Edit, Trash2 } from "lucide-react";
import { getElementSection, updateElementDetails, removeComponent } from "@/app/surveys/building-survey-reports/Survey";

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
  const [isHydrated, survey] = surveyStore.useGet(surveyId);

  useEffect(() => {
    const loadElementData = async () => {
      if(!isHydrated || !survey) return;

      try {
        const elementSection = getElementSection(survey, sectionName, elementId);
        
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
  }, [sectionName, elementId, reset, isHydrated, survey]);

  const onValid = async (data: ElementFormData) => {
    await surveyStore.update(surveyId, (survey) => {
      return updateElementDetails(survey, sectionName, elementId, {
        description: data.description,
        images: data.images,
      });
    });

    drawer.closeDrawer();
    toast.success("Element details saved");
  };

  const handleRemoveComponent = async (componentId: string) => {
    try {
      await surveyStore.update(surveyId, (survey) => {
        const updatedSurvey = removeComponent(survey, sectionName, elementId, componentId);
        if (updatedSurvey === survey) {
          throw new Error("Failed to remove component");
        }
        return updatedSurvey;
      });

      // Update local state to reflect the removal
      if (elementData) {
        setElementData({
          ...elementData,
          components: elementData.components.filter(component => component.id !== componentId)
        });
      }

      toast.success("Component removed successfully");
    } catch (error) {
      toast.error("Failed to remove component");
    }
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
          <div className="space-y-2">
            {elementData?.components.map((component) => (
              <div key={component.id} className="flex items-center justify-between p-1 pl-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-sm ${
                    component.ragStatus === "Red" ? "bg-red-500" :
                    component.ragStatus === "Amber" ? "bg-amber-500" :
                    component.ragStatus === "Green" ? "bg-green-500" :
                    "bg-gray-500"
                  }`} />
                  <span className="text-sm truncate" >{component.useNameOverride ? component.nameOverride : component.name}</span>
                </div>
                <div className="flex items-center space-x-2">
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
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveComponent(component.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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
