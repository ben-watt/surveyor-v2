"use client";

import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormStatus,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { useRouter } from "next/navigation";
import { DynamicDrawer } from "@/app/home/components/Drawer";
import { useAutoSaveForm } from "../../../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../../../components/LastSavedIndicator";
import { 
  checklistSchema,
  ChecklistInput,
  updateChecklistStatus
} from "../../schemas";
import toast from "react-hot-toast";

import { useEffect, useState, useMemo } from "react";
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
  initValues: any; // Legacy format - will be transformed to ChecklistInput
  surveyData: any; // The full survey data to access updatedAt
}

const ChecklistForm = ({ id, initValues, surveyData }: ChecklistFormProps) => {
  const [entityData, setEntityData] = useState<any>(null);
  
  // Transform legacy Input<boolean>[] format to new Zod format
  const transformedInitValues = useMemo(() => ({
    items: initValues?.items?.map((item: any) => ({
      value: item.value,
      required: item.required,
      type: item.type,
      label: item.label,
      placeholder: item.placeholder,
      order: item.order
    })) || [],
    _meta: initValues?._meta
  }), [initValues]);
  
  const methods = useForm<ChecklistInput>({
    resolver: zodResolver(checklistSchema),
    defaultValues: transformedInitValues,
    mode: 'onChange'
  });

  const { register, control, watch, getValues, trigger, formState: { errors } } = methods;
  const router = useRouter();

  useEffect(() => {
    if (surveyData) {
      setEntityData(surveyData);
    }
  }, [surveyData]);


  // Autosave functionality
  const saveChecklist = async (data: ChecklistInput, { auto = false }: { auto?: boolean } = {}) => {
    if (!id) return;

    try {
      console.log('[ChecklistForm] Starting save with data:', data);
      
      // Update form metadata with current validation status
      const updatedMeta = updateChecklistStatus(data);
      const dataWithMeta = {
        ...data,
        _meta: updatedMeta
      };

      await surveyStore.update(id, (survey) => {
        // Transform Zod format back to legacy format for storage compatibility
        const legacyFormat = {
          ...dataWithMeta,
          items: dataWithMeta.items.map((item: any) => ({
            value: item.value,
            required: item.required,
            type: item.type,
            label: item.label,
            placeholder: item.placeholder,
            order: item.order
          }))
        };
        survey.checklist = legacyFormat;
      });

      console.log('[ChecklistForm] Save completed successfully:', { auto });

      if (!auto) {
        toast.success("Checklist saved successfully");
        router.push(`/home/surveys/${id}`);
      }
    } catch (error) {
      console.error("[ChecklistForm] Save failed", error);
      if (!auto) toast.error("Error saving checklist");
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt, resetStatus } = useAutoSaveForm(
    saveChecklist,
    watch,
    getValues,
    trigger,
    {
      enabled: !!id,
      validateBeforeSave: false,
      delay: 500 // Use 500ms delay instead of default 300ms
    }
  );

  // Reset autosave status when form initializes to prevent false data comparison
  useEffect(() => {
    if (id && transformedInitValues) {
      resetStatus();
    }
  }, [id, transformedInitValues, resetStatus]);


  return (
    <FormProvider {...methods}>
      <div className="space-y-4">
        {transformedInitValues.items.map((checklist: any, index: number) => {
          return (
            <div className="mt-4 mb-4" key={index}>
              <div>
                {mapToInputType(checklist, `items.${index}.value` as any, register, control, errors)}
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
