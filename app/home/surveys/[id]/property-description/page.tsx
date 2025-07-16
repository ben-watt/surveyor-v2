"use client";

import { FormProvider, useForm } from "react-hook-form";
import {
  PropertyDescription,
  Input,
  FormStatus,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { useRouter } from "next/navigation";
import { useEffect, useState, use, useCallback } from "react";
import { DynamicDrawer } from "@/app/home/components/Drawer";
import { useAutoSaveSurveyForm } from "../../../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../../../components/LastSavedIndicator";
import toast from "react-hot-toast";

function isInputT<T>(input: any): input is Input<T> {
  return input.type !== undefined;
}

interface PropertyDescriptionPageProps {
  params: Promise<{
    id: string;
  }>;
}

const PropertyDescriptionPage = (props: PropertyDescriptionPageProps) => {
  const params = use(props.params);

  const {
    id
  } = params;

  const [isHydrated, survey] = surveyStore.useGet(id);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  useEffect(() => {
    if (isHydrated) {
      setIsOpen(true);
    }
  }, [isHydrated]);

  return (
    <div>
      {!isHydrated && <div>Loading...</div>}
      {isHydrated && survey && (
        <DynamicDrawer
          id={id + "/property-description"}
          isOpen={isOpen}
          handleClose={handleClose}
          title="Property Description"
          description="Property Description"
          content={
            <PropertyDescriptionForm
              id={id}
              initValues={survey.propertyDescription}
              surveyData={survey}
            />
          }
        />
      )}
    </div>
  );
};

interface PropertyDescriptionFormProps {
  id: string;
  initValues: PropertyDescription;
  surveyData: any; // The full survey data to access updatedAt
}

const PropertyDescriptionForm = ({
  id,
  initValues,
  surveyData,
}: PropertyDescriptionFormProps) => {
  const [entityData, setEntityData] = useState<any>(null);
  const methods = useForm<PropertyDescription>({ 
    defaultValues: initValues,
    mode: 'onChange' // Enable validation on change
  });
  const { register, control, watch, getValues, trigger, formState: { errors } } = methods;
  const router = useRouter();

  // Set entity data when component mounts
  useEffect(() => {
    if (surveyData) {
      setEntityData(surveyData);
    }
  }, [surveyData]);

  // Debug: Log form changes
  useEffect(() => {
    const subscription = watch((data, { name, type }) => {
      console.log("[PropertyDescriptionForm] Form changed:", {
        name,
        type,
        value: data?.[name as keyof PropertyDescription],
        allData: data
      });
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  // Autosave functionality
  const savePropertyDescription = async (data: PropertyDescription, { auto = false }: { auto?: boolean } = {}) => {
    try {
      console.log("[PropertyDescriptionForm] Saving data:", data);
      
      await surveyStore.update(id, (currentState) => {
        // Update each field's value property
        Object.keys(data).forEach((key) => {
          const propKey = key as keyof Omit<PropertyDescription, "status">;
          const property = data[propKey] as Input<any>;
          if (isInputT(property) && currentState.propertyDescription[propKey]) {
            console.log(`[PropertyDescriptionForm] Updating ${propKey} with value:`, property.value);
            (currentState.propertyDescription[propKey] as Input<any>).value = property.value;
          }
        });
        
        currentState.propertyDescription.status = {
          status: FormStatus.Complete,
          errors: [],
        };
      });

      if (!auto) {
        toast.success("Property description saved successfully");
        router.push(`/home/surveys/${id}`);
      } else {
        console.log("[PropertyDescriptionForm] Auto-saved successfully");
      }
    } catch (error) {
      console.error("Failed to save property description", error);
      if (!auto) toast.error("Error saving property description");
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveSurveyForm(
    savePropertyDescription,
    watch,
    getValues,
    trigger,
    {
      delay: 2000, // 2 second delay for autosave
      showToast: false, // Don't show toast for autosave
      enabled: true,
      validateBeforeSave: true // Enable validation before auto-save
    }
  );

  console.log("[PropertyDescriptionForm] Auto-save status:", { saveStatus, isSaving, lastSavedAt });

  return (
    <FormProvider {...methods}>
      <div className="space-y-4">
        {Object.keys(initValues)
          .sort((a, b) => (initValues[a as keyof PropertyDescription] as Input<any>).order - (initValues[b as keyof PropertyDescription] as Input<any>).order)
          .map((key) => {
            const propKey = key as keyof Omit<PropertyDescription, "status">;
            const property = initValues[propKey] as Input<any>;

            if (isInputT(property)) {
              const reqName = `${propKey}.value` as const;

              return (
                <div key={key} className="mt-1 mb-1">
                  {mapToInputType(property, reqName, register, control, errors)}
                </div>
              );
            } else {
              return null;
            }
          })}
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt || undefined}
          entityUpdatedAt={entityData?.updatedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
};

export default PropertyDescriptionPage;
