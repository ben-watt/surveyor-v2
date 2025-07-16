"use client";

import {
  FormProvider,
  useForm,
} from "react-hook-form";
import {
  PropertyDescription,
  Checklist,
  FormStatus,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { useRouter } from "next/navigation";
import { DynamicDrawer } from "@/app/home/components/Drawer";
import { useAutoSaveSurveyForm } from "../../../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../../../components/LastSavedIndicator";
import toast from "react-hot-toast";

import { useEffect, useState, use } from "react";

interface ChecklistPageProps {
  params: Promise<{
    id: string;
  }>;
}

const ChecklistPage = (props: ChecklistPageProps) => {
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
          id={id + "/checklist"}
          isOpen={isOpen}
          handleClose={handleClose}
          title="Checklist"
          description="Checklist"
          content={
            <ChecklistForm
              id={id}
              initValues={survey.checklist}
              surveyData={survey}
            />
          }
        />
      )}
    </div>
  );
};

interface ChecklistFormProps {
  id: string;
  initValues: Checklist;
  surveyData: any; // The full survey data to access updatedAt
}

const ChecklistForm = ({ id, initValues, surveyData }: ChecklistFormProps) => {
  const [entityData, setEntityData] = useState<any>(null);
  const methods = useForm<Checklist>({ 
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
      console.log("[ChecklistForm] Form changed:", {
        name,
        type,
        value: data?.[name as keyof Checklist],
        allData: data
      });
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  // Autosave functionality
  const saveChecklist = async (data: Checklist, { auto = false }: { auto?: boolean } = {}) => {
    try {
      console.log("[ChecklistForm] Saving data:", data);
      
      await surveyStore.update(id, (currentState) => {
        // Update each checklist item's value property
        if (data.items && currentState.checklist.items) {
          data.items.forEach((item, index) => {
            if (currentState.checklist.items[index]) {
              console.log(`[ChecklistForm] Updating item ${index} with value:`, item.value);
              currentState.checklist.items[index].value = item.value;
            }
          });
        }
        
        currentState.checklist.status = {
          status: FormStatus.Complete,
          errors: [],
        };
      });

      if (!auto) {
        toast.success("Checklist saved successfully");
        router.push(`/home/surveys/${id}`);
      } else {
        console.log("[ChecklistForm] Auto-saved successfully");
      }
    } catch (error) {
      console.error("Failed to save checklist", error);
      if (!auto) toast.error("Error saving checklist");
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveSurveyForm(
    saveChecklist,
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

  console.log("[ChecklistForm] Auto-save status:", { saveStatus, isSaving, lastSavedAt });

  return (
    <FormProvider {...methods}>
      <div className="space-y-4">
        {initValues.items.map((checklist, index) => {
          return (
            <div className="mt-4 mb-4" key={index}>
              <div>
                {mapToInputType(checklist, `items.${index}.value`, register, control, errors)}
              </div>
            </div>
          );
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

export default ChecklistPage;
