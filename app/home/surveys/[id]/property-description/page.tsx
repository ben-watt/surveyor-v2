"use client";

import { FormProvider, useForm } from "react-hook-form";
import {
  PropertyDescription,
  Input,
  FormStatus,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DynamicDrawer } from "@/app/home/components/Drawer";
import { useAutoSaveForm } from "../../../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../../../components/LastSavedIndicator";
import { usePropertyDescriptionFormStatus } from "../../../hooks/useReactiveFormStatus";
import toast from "react-hot-toast";

function isInputT<T>(input: any): input is Input<T> {
  return input.type !== undefined;
}

const PropertyDescriptionPage = () => {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

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
  
  // Reactive status computation
  const watchedData = watch();
  const formStatus = usePropertyDescriptionFormStatus(
    watchedData || {},
    trigger
  );

  // Set entity data when component mounts
  useEffect(() => {
    if (surveyData) {
      setEntityData(surveyData);
    }
  }, [surveyData]);

  // Debug: Log form changes
  useEffect(() => {
    const subscription = watch((data, { name, type }) => {
    });

    return () => subscription?.unsubscribe();
  }, [watch]);

  // Autosave functionality
  const savePropertyDescription = async (data: PropertyDescription, { auto = false }: { auto?: boolean } = {}) => {
    try {
      await surveyStore.update(id, (currentState) => {
        // Update each field's value property
        Object.keys(data).forEach((key) => {
          const propKey = key as keyof PropertyDescription;
          const property = data[propKey] as Input<any>;
          if (isInputT(property) && currentState.propertyDescription[propKey]) {
            (currentState.propertyDescription[propKey] as Input<any>).value = property.value;
          }
        });
      });

      if (!auto) {
        toast.success("Property description saved successfully");
        router.push(`/home/surveys/${id}`);
      }
    } catch (error) {
      console.error("Failed to save property description", error);
      if (!auto) toast.error("Error saving property description");
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    savePropertyDescription,
    watch,
    getValues,
    trigger,
    {
      delay: 1000, // Match ReportDetailsForm delay
      showToast: false, // Don't show toast for autosave
      enabled: true,
      validateBeforeSave: false // Allow saving partial/invalid data
    }
  );


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
