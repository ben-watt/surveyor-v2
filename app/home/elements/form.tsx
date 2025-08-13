"use client";

import Input from "@/app/home/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { useCallback, useEffect, useRef } from "react";
import { DynamicComboBox } from "../components/Input";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { elementStore, sectionStore } from "../clients/Database";
import { Element } from "../clients/Dexie";
import { v4 as uuidv4 } from "uuid";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { getAutoSaveTimings } from "../utils/autosaveTimings";
import { LastSavedIndicator } from "../components/LastSavedIndicator";


interface DataFormProps {
  id?: string;
  defaultValues?: Partial<Element>;
}

export function DataForm({ id, defaultValues }: DataFormProps) {
  const idRef = useRef(id ?? uuidv4());
  const form = useForm<Element>({
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
  const drawer = useDynamicDrawer();
  const [sectionsHydrated, sections] = sectionStore.useList();
  const { register, control, watch, getValues, trigger, formState: { errors } } = form;

  const [elementHydrated, element] = elementStore.useGet(idRef.current);

  useEffect(() => {
    if (elementHydrated && element) {
      const originalId = element.id.includes('#') ? element.id.split('#')[0] : element.id;
      form.reset({ ...(element as any), id: originalId });
    }
  }, [elementHydrated, element, form]);

  // Autosave functionality
  const saveElement = useCallback(
    async (data: Element, { auto = false }: { auto?: boolean } = {}) => {
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

  if(!sectionsHydrated) {
    return <div>Loading...</div>
  }

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name", { required: "Name is required" })}
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
          rules={{ required: "Section is required" }}
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