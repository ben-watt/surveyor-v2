import React, { useEffect } from "react";
import { useForm, FormProvider, FieldErrors } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import { FormSection } from "@/app/app/components/FormSection";
import { ElementSection, FormStatus, SurveySection } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { surveyStore, elementStore, sectionStore } from "@/app/app/clients/Database";
import { RhfInputImage } from "@/app/app/components/Input/InputImage";
import TextAreaInput from "@/app/app/components/Input/TextAreaInput";
import { useDynamicDrawer } from "@/app/app/components/Drawer";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import InspectionForm from "./InspectionForm";
import { Edit, Trash2 } from "lucide-react";
import { getElementSection, updateElementDetails, removeComponent } from "@/app/app/surveys/building-survey-reports/Survey";

type ElementFormData = {
  description: string;
  images: string[];
}

interface ElementFormProps {
  surveyId: string;
  sectionId: string;
  elementId: string;
}

export default function ElementForm({ surveyId, sectionId, elementId }: ElementFormProps) {

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
  const [elementsHydrated, elements] = elementStore.useList();
  const [sectionsHydrated, surveySections] = sectionStore.useList();

  useEffect(() => {
    const loadElementData = async () => {
      if(!isHydrated || !survey) return;

      try {
        const elementSection = getElementSection(survey, sectionId, elementId);
        
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
  }, [elementId, reset, isHydrated, survey, sectionId]);

  const onValid = async (data: ElementFormData) => {
    console.debug("[ElementForm] onValid", data);
    await surveyStore.update(surveyId, (survey) => {
      updateElementDetails(survey, sectionId, elementId, {
        description: data.description,
        images: data.images,
        status: {
          status: FormStatus.Complete,
          errors: [],
        },
      });
    });


    drawer.closeDrawer();
    toast.success("Element details saved");
  };

  const onInvalid = async (errors: FieldErrors<ElementFormData>) => { 
    console.error("[ElementForm] onInvalid", errors);
    await surveyStore.update(surveyId, (survey) => {
      return updateElementDetails(survey, sectionId, elementId, {
        status: {
          status: FormStatus.Error,
          errors: [errors.description?.message || ""],
        }
      });

    });
  };


  const handleRemoveComponent = async (inspectionId: string) => {
    const section = surveySections.find(s => s.id === sectionId);

    if (!section) {
      toast.error("Section not found");
      return;
    }
    
    await surveyStore.update(surveyId, (survey) => {
      return removeComponent(survey, section.name, elementId, inspectionId);
    });
    toast.success("Component removed");
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

  console.debug("[ElementForm] render", `report-images/${surveyId}/elements/${elementId}`);

  return (
    <FormProvider {...methods}>
      <DevTool control={control} />
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-6">
        <FormSection title="Element Details">
          <TextAreaInput
            className="h-36"
            labelTitle="Description"
            register={() => register("description")}
            placeholder="Enter element description"
          />
          <div className="space-y-2">
            <RhfInputImage rhfProps={{ name: "images" }} path={`report-images/${surveyId}/elements/${elementId}`} labelText="Images" />
          </div>
        </FormSection>

        <FormSection title="Components">
          <div className="space-y-2">
            {elementData?.components.map((component) => (
              <div key={component.id} className="flex items-center justify-between p-1 pl-4 border rounded-lg">
                <div className="flex items-center space-x-4 min-w-20">
                  <div className={`flex-shrink-0 w-4 h-4 rounded-sm ${
                    component.ragStatus === "Red" ? "bg-red-500" :
                    component.ragStatus === "Amber" ? "bg-amber-500" :
                    component.ragStatus === "Green" ? "bg-green-500" :
                    "bg-gray-500"
                  }`} />
                  <span className="text-sm truncate min-w-0 flex-1">{component.useNameOverride ? component.nameOverride : component.name}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      drawer.openDrawer({
                        id: `${surveyId}-condition-inspect-${component.id}`,
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
                      handleRemoveComponent(component.inspectionId);
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
          <Button variant="secondary" type="button" className="w-full" onClick={() => {
            drawer.openDrawer({
              id: `${surveyId}-condition-add-component`,
              title: `Add Component`,
              description: `Add a component to the element`,
              content: <InspectionForm
                surveyId={surveyId}
                defaultValues={{
                  element: {
                    id: elementId,
                    name: elementData?.name || "",
                  }
                }}
              />
            });
          }}>
          Add Component
        </Button>
        </FormSection>
        <Button type="submit" className="w-full">
          Save Element Details
        </Button>
      </form>
    </FormProvider>
  );
}
