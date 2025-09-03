"use client";

import {
  FormProvider,
  useForm,
} from "react-hook-form";
import {
  Checklist,
  FormStatus,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { useRouter } from "next/navigation";
import { DynamicDrawer } from "@/app/home/components/Drawer";
import { useAutoSaveForm } from "../../../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../../../components/LastSavedIndicator";
import { createFormOptions, createAutosaveConfig } from "../../../hooks/useFormConfig";
import { useChecklistFormStatus } from "../../../hooks/useReactiveFormStatus";
import toast from "react-hot-toast";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const ChecklistPage = () => {
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

interface ChecklistFormData {
  items: Array<{
    id: string;
    text: string;
    required: boolean;
    value: boolean;
    type: string;
    order: number;
  }>;
}

interface ChecklistFormProps {
  id: string;
  initValues: Checklist;
  surveyData: any; // The full survey data to access updatedAt
}

const ChecklistForm = ({ id, initValues, surveyData }: ChecklistFormProps) => {
  const [entityData, setEntityData] = useState<any>(null);
  const methods = useForm<Checklist>(createFormOptions(initValues));
  const { register, control, watch, getValues, trigger, formState: { errors } } = methods;
  
  // Reactive status computation  
  const watchedData = watch();
  const formStatus = useChecklistFormStatus(watchedData?.items, trigger);
  const router = useRouter();

  // Set entity data when component mounts
  useEffect(() => {
    if (surveyData) {
      setEntityData(surveyData);
    }
  }, [surveyData]);


  // Autosave functionality
  const saveChecklist = async (data: Checklist, { auto = false }: { auto?: boolean } = {}) => {
    try {
      await surveyStore.update(id, (currentState) => {
        // Update each checklist item's value property
        if (data.items && currentState.checklist.items) {
          data.items.forEach((item, index) => {
            if (currentState.checklist.items[index]) {
              currentState.checklist.items[index].value = item.value;
            }
          });
        }
      });

      if (!auto) {
        toast.success("Checklist saved successfully");
        router.push(`/home/surveys/${id}`);
      }
    } catch (error) {
      console.error("Failed to save checklist", error);
      if (!auto) toast.error("Error saving checklist");
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveChecklist,
    watch,
    getValues,
    trigger,
    createAutosaveConfig({ enabled: true })
  );


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
