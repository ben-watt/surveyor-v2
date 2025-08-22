"use client";

import Input from "@/app/home/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { componentStore, elementStore } from "@/app/home/clients/Database";
import type { Component } from "@/app/home/clients/Dexie";
import { DynamicComboBox } from "@/app/home/components/Input";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { getAutoSaveTimings } from "../utils/autosaveTimings";
import { LastSavedIndicator } from "../components/LastSavedIndicator";

// Zod schema for component validation
const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  elementId: z.string().min(1, "Element is required"),
  materials: z.array(z.object({
    name: z.string().min(1, "Material name is required")
  })).transform(val => val || [])
});

type ComponentFormData = z.infer<typeof componentSchema>;

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<Component>;
}

export function DataForm({ id, defaultValues }: DataFormProps) {
  const idRef = useRef(id ?? uuidv4());
  const methods = useForm<ComponentFormData>({ 
    defaultValues: { id: idRef.current, name: "", elementId: "", materials: [], ...defaultValues },
    mode: 'onChange'
  });
  const { register, handleSubmit, control, watch, getValues, trigger, formState: { errors } } = methods;
  const drawer = useDynamicDrawer();
  const router = useRouter();

  const [elementsHydrateds, elements] = elementStore.useList();
  const [componentHydrated, component] = componentStore.useGet(idRef.current);

  // Track if we've done the initial reset to prevent wiping user input on autosave
  const [hasInitialReset, setHasInitialReset] = useState(false);

  useEffect(() => {
    if (componentHydrated && component && !hasInitialReset) {
      // Only reset on initial load, not on subsequent updates from autosave
      methods.reset({
        id: component.id,
        name: component.name ?? '',
        elementId: component.elementId ?? '',
        materials: component.materials ?? []
      } as any, { keepDirtyValues: true });
      setHasInitialReset(true);
    }
  }, [methods, componentHydrated, component, hasInitialReset]);

  const saveComponent = useCallback(
    async (data: ComponentFormData, { auto = false }: { auto?: boolean } = {}) => {
      try {
        if (componentHydrated && component) {
          await componentStore.update(idRef.current, draft => {
            draft.name = data.name;
            draft.elementId = data.elementId;
            draft.materials = data.materials;
          });
        } else {
          await componentStore.add({
            id: idRef.current,
            name: data.name,
            elementId: data.elementId,
            materials: data.materials,
          });
        }

        if (!auto) {
          toast.success("Saved");
          if (drawer.isOpen) {
            drawer.closeDrawer();
          } else {
            router.push("/home/building-components");
          }
        }
      } catch (error) {
        console.error("Failed to save data", error);
        if (!auto) toast.error("Error unable to save data.");
        throw error; // Re-throw for autosave error handling
      }
    },
    [componentHydrated, component, drawer, router]
  );

  const timings = getAutoSaveTimings(2000);
  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveComponent,
    watch,
    getValues,
    trigger,
    {
      delay: timings.delay,
      watchDelay: timings.watchDelay,
      showToast: false, // Don't show toast for autosave
      enabled: componentHydrated,
      validateBeforeSave: true // Enable validation before auto-save
    }
  );


  if (!componentHydrated || !elementsHydrateds) {
    return <div>Loading...</div>;
  }

  return (
    <FormProvider {...methods}>
      <div className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name")}
          errors={errors}
        />
        <DynamicComboBox
          labelTitle="Element"
          name="elementId"
          control={control}
          rules={{}}
          data={elements.map((x) => ({ label: x.name, value: x.id }))}
          errors={errors}
        />
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt || undefined}
          entityUpdatedAt={component?.updatedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}