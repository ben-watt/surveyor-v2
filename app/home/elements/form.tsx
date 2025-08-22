"use client";

import Input from "@/app/home/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { DynamicComboBox } from "../components/Input";
import toast from "react-hot-toast";
import { elementStore, sectionStore } from "../clients/Database";
import { Element } from "../clients/Dexie";
import { v4 as uuidv4 } from "uuid";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { getAutoSaveTimings } from "../utils/autosaveTimings";
import { LastSavedIndicator } from "../components/LastSavedIndicator";

// Zod schema for element validation
const elementSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  sectionId: z.string().min(1, "Section is required"),
  order: z.number().min(0, "Order must be 0 or greater").nullable().optional(),
  description: z.string().nullable().optional()
});

type ElementFormData = z.infer<typeof elementSchema>;

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<Element>;
}

export function DataForm({ id, defaultValues }: DataFormProps) {
  const idRef = useRef(id ?? uuidv4());
  const form = useForm<ElementFormData>({
    defaultValues: {
      id: idRef.current,
      name: "",
      sectionId: "",
      order: 0,
      description: "",
      ...defaultValues,
    },
    mode: 'onChange'
  });

  const [sectionsHydrated, sections] = sectionStore.useList();
  const [elementHydrated, element] = elementStore.useGet(idRef.current);
  const { register, control, watch, getValues, trigger, formState: { errors } } = form;

  // Track if we've done the initial reset to prevent wiping user input on autosave
  const [hasInitialReset, setHasInitialReset] = useState(false);

  useEffect(() => {
    if (elementHydrated && element && !hasInitialReset) {
      // Only reset on initial load, not on subsequent updates from autosave
      form.reset({
        id: element.id,
        name: element.name ?? '',
        sectionId: element.sectionId ?? '',
        order: element.order ?? undefined,
        description: element.description ?? undefined,
      }, { keepDirtyValues: true });
      setHasInitialReset(true);
    }
  }, [form, elementHydrated, element, hasInitialReset]);

  const saveElement = useCallback(
    async (data: ElementFormData, { auto = false }: { auto?: boolean } = {}) => {
      console.debug("[DataForm] saveElement", { data, auto });
      try {
        if (elementHydrated && element) {
          await elementStore.update(idRef.current, draft => {
            draft.name = data.name;
            draft.order = data.order;
            draft.sectionId = data.sectionId;
            draft.description = data.description;
          });
          if (!auto) toast.success("Updated Element");
        } else {
          await elementStore.add({
            id: idRef.current,
            name: data.name,
            sectionId: data.sectionId,
            order: data.order,
            description: data.description,
          });
          if (!auto) toast.success("Created Element");
        }
      } catch (error) {
        if (!auto) toast.error("Error saving element");
        console.error("Failed to save", error);
        throw error;
      }
    },
    [elementHydrated, element]
  );

  const timings = getAutoSaveTimings(2000);
  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveElement,
    watch,
    getValues,
    trigger,
    {
      delay: timings.delay,
      watchDelay: timings.watchDelay,
      showToast: false, // Don't show toast for autosave
      enabled: elementHydrated,
      validateBeforeSave: true // Enable validation before auto-save
    }
  );

  // Remove onSubmit since we're using autosave only
  // The form will automatically save as the user types

  if(!sectionsHydrated || !elementHydrated) {
    return <div>Loading...</div>
  }

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name")}
          errors={errors}
        />
        <Input
          labelTitle="Description"
          register={() => register("description")}
          errors={errors}
        />
        <DynamicComboBox
          labelTitle="Section"
          data={sections.map(s => ({ value: s.id, label: s.name }))}
          name="sectionId"
          control={control}
          rules={{}}
          errors={errors}
        />
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt || undefined}
          entityUpdatedAt={element?.updatedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}