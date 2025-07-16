import React, { useEffect, memo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import { FormSection } from "@/app/home/components/FormSection";
import { ElementSection, FormStatus, SurveyImage, SurveySection } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { surveyStore, elementStore, sectionStore } from "@/app/home/clients/Database";
import TextAreaInput from "@/app/home/components/Input/TextAreaInput";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import InspectionForm from "./InspectionForm";
import { Edit, Trash2 } from "lucide-react";
import { getElementSection, updateElementDetails, removeComponent } from "@/app/home/surveys/building-survey-reports/Survey";
import { useAutoSaveFormWithImages } from "@/app/home/hooks/useAutoSaveFormWithImages";
import { LastSavedIndicatorWithUploads } from "@/app/home/components/LastSavedIndicatorWithUploads";
import { useImageUploadStatus } from "@/app/home/components/InputImage/useImageUploadStatus";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage/RhfDropZoneInputImage";
// Memoized Add Component button component
const AddComponentButton = memo(({ 
  surveyId, 
  elementId, 
  elementName,
  imageUploadPath 
}: { 
  surveyId: string;
  elementId: string;
  elementName: string;
  imageUploadPath: string;
}) => {
  const drawer = useDynamicDrawer();
  const { isUploading } = useImageUploadStatus([imageUploadPath]);

  return (
    <Button 
      variant="secondary" 
      type="button" 
      className="w-full" 
      disabled={isUploading}
      onClick={() => {
        drawer.openDrawer({
          id: `${surveyId}-condition-add-component`,
          title: `Add Component`,
          description: `Add a component to the element`,
          content: <InspectionForm
            surveyId={surveyId}
            defaultValues={{
              element: {
                id: elementId,
                name: elementName,
              }
            }}
          />
        });
      }}
    >
      {isUploading ? 'Please wait for images to finish uploading...' : 'Add Component'}
    </Button>
  );
});

AddComponentButton.displayName = 'AddComponentButton';

type ElementFormData = {
  description: string;
  images: SurveyImage[];
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
  const { register, control, reset, watch, getValues, trigger } = methods;
  const [elementData, setElementData] = React.useState<ElementSection | null>(null);
  const [isHydrated, survey] = surveyStore.useGet(surveyId);
  const [elementsHydrated, elements] = elementStore.useList();
  const [sectionsHydrated, surveySections] = sectionStore.useList();
  const imageUploadPath = `report-images/${surveyId}/elements/${elementId}`;

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

  const saveData = async (data: ElementFormData, { auto = false } = {}) => {
    console.debug("[ElementForm] saveData", { data, auto });
    
    try {
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

      if (!auto) {
        // For manual saves, close drawer and show toast
        drawer.closeDrawer();
        toast.success("Element details saved");
      }
    } catch (error) {
      console.error("[ElementForm] Save failed", error);
      
      // Update status to show error
      await surveyStore.update(surveyId, (survey) => {
        return updateElementDetails(survey, sectionId, elementId, {
          status: {
            status: FormStatus.Error,
            errors: ["Failed to save element details"],
          }
        });
      });
      
      if (!auto) {
        toast.error("Failed to save element details");
      }
      
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, isUploading, lastSavedAt } = useAutoSaveFormWithImages(
    saveData,
    watch,
    getValues,
    trigger,
    {
      delay: 1500,
      enabled: !!surveyId && !!elementData, // Only enable autosave when element data is loaded
      imagePaths: [imageUploadPath]
    }
  );


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

  return (
    <FormProvider {...methods}>
      <DevTool control={control} />
      <div className="space-y-6">
        <FormSection title="Element Details">
          <TextAreaInput
            className="h-36"
            labelTitle="Description"
            register={() => register("description")}
            placeholder="Enter element description"
          />
          <div className="space-y-2 image-w-50">
            <RhfDropZoneInputImage
              rhfProps={{ name: "images" }}
              path={`report-images/${surveyId}/elements/${elementId}`}
              labelText="Images"
              maxFiles={20}
              minFiles={1}
              features={{
                archive: true,
                metadata: true
              }}
            />
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
          <AddComponentButton 
            surveyId={surveyId}
            elementId={elementId}
            elementName={elementData?.name || ""}
            imageUploadPath={imageUploadPath}
          />
        </FormSection>
        <LastSavedIndicatorWithUploads
          status={saveStatus}
          isUploading={isUploading}
          lastSavedAt={lastSavedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}
