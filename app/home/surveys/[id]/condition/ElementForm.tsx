import React, { useEffect, memo, useMemo, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import { FormSection } from "@/app/home/components/FormSection";
import { Button } from "@/components/ui/button";
import { surveyStore, sectionStore } from "@/app/home/clients/Database";
import TextAreaInput from "@/app/home/components/Input/TextAreaInput";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import InspectionForm from "./InspectionForm";
import { getElementSection, updateElementDetails, removeComponent } from "@/app/home/surveys/building-survey-reports/Survey";
import { useAutoSaveFormWithImages } from "@/app/home/hooks/useAutoSaveFormWithImages";
import { LastSavedIndicatorWithUploads } from "@/app/home/components/LastSavedIndicatorWithUploads";
import { useImageUploadStatus } from "@/app/home/components/InputImage/useImageUploadStatus";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage/RhfDropZoneInputImage";
import { createAutosaveConfigWithImages } from "@/app/home/hooks/useFormConfig";
import { ComponentsList } from "./ComponentsList";
import { ElementFormSchema, type ElementFormData } from "./ElementFormSchema";
import { Label } from "@/components/ui/label";

interface AddComponentButtonProps {
  surveyId: string;
  elementId: string;
  elementName: string;
  imageUploadPath: string;
}

const AddComponentButton = memo(({ 
  surveyId, 
  elementId, 
  elementName,
  imageUploadPath 
}: AddComponentButtonProps) => {
  const drawer = useDynamicDrawer();
  const { isUploading } = useImageUploadStatus([imageUploadPath]);

  const handleClick = useCallback(() => {
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
  }, [drawer, surveyId, elementId, elementName]);

  return (
    <Button 
      variant="secondary" 
      type="button" 
      className="w-full" 
      disabled={isUploading}
      onClick={handleClick}
    >
      {isUploading ? 'Please wait for images to finish uploading...' : 'Add Component'}
    </Button>
  );
});

AddComponentButton.displayName = 'AddComponentButton';

interface ElementFormProps {
  surveyId: string;
  sectionId: string;
  elementId: string;
}

const ElementForm: React.FC<ElementFormProps> = ({ surveyId, sectionId, elementId }) => {
  const drawer = useDynamicDrawer();
  const [isLoading, setIsLoading] = React.useState(true);

  const [isSurveyHydrated, survey] = surveyStore.useGet(surveyId);
  const [isSectionsHydrated, surveySections] = sectionStore.useList();
  
  const imageUploadPath = useMemo(() => 
    `report-images/${surveyId}/elements/${elementId}`, 
    [surveyId, elementId]
  );

  const defaultValues: ElementFormData = useMemo(() => ({
    description: "",
    images: [],
  }), []);

  const methods = useForm<ElementFormData>({
    defaultValues,
    mode: 'onChange',
  });
  
  const { register, control, reset, watch, getValues, trigger } = methods;

  const getElement = useCallback(() => {
    if(!survey) return null;
    return getElementSection(survey, sectionId, elementId);
  }, [survey, sectionId, elementId]);

  useEffect(() => {
    if(!isSurveyHydrated || !isSectionsHydrated) return; 
    const elementSection = getElement();
    if(!elementSection) return;
    
    reset({
      description: elementSection.description || "",
      images: elementSection.images || [],
    });
    setIsLoading(false);
  }, [isSurveyHydrated, isSectionsHydrated, reset, getElement]);

  const saveData = useCallback(async (data: ElementFormData, { auto = false } = {}) => {
    try {
      await surveyStore.update(surveyId, (survey) => {
        updateElementDetails(survey, sectionId, elementId, {
          description: data.description,
          images: data.images,
        });
      });

      if (!auto) {
        drawer.closeDrawer();
        toast.success("Element details saved");
      }
    } catch (error) {
      console.error("[ElementForm] Save failed:", error);
      
      if (!auto) {
        const message = error instanceof Error ? error.message : "Failed to save element details";
        toast.error(message);
      }
      
      throw error;
    }
  }, [surveyId, sectionId, elementId, drawer]);

  const { saveStatus, isUploading, lastSavedAt } = useAutoSaveFormWithImages(
    saveData,
    watch,
    getValues,
    trigger,
    {
      ...createAutosaveConfigWithImages(
        [imageUploadPath],
        { enabled: !isLoading }
      ),
      watchChanges: !isLoading
    }
  );

  const handleRemoveComponent = useCallback(async (inspectionId: string) => {
    try {
      const section = surveySections.find(s => s.id === sectionId);

      if (!section) {
        toast.error("Section not found");
        return;
      }
      
      await surveyStore.update(surveyId, (survey) => {
        return removeComponent(survey, section.name, elementId, inspectionId);
      });
      
      toast.success("Component removed");
    } catch (error) {
      console.error("[ElementForm] Failed to remove component:", error);
      toast.error("Failed to remove component");
    }
  }, [surveySections, sectionId, surveyId, elementId]);

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
          <ComponentsList
            components={getElement()?.components || []}
            surveyId={surveyId}
            onRemoveComponent={handleRemoveComponent}
          />
          <AddComponentButton 
            surveyId={surveyId}
            elementId={elementId}
            elementName={getElement()?.name || ""}
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
};

export default ElementForm;