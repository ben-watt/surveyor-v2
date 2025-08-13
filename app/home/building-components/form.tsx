"use client";

import Input from "@/app/home/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { useCallback, useEffect, useRef } from "react";
import { componentStore, elementStore } from "@/app/home/clients/Database";
import type { Component } from "@/app/home/clients/Dexie";
import { Schema } from "@/amplify/data/resource";
import { DynamicComboBox } from "@/app/home/components/Input";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { getAutoSaveTimings } from "../utils/autosaveTimings";
import { LastSavedIndicator } from "../components/LastSavedIndicator";

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<Component>;
}

export function DataForm({ id, defaultValues }: DataFormProps) {
  const idRef = useRef(id ?? uuidv4());
  const methods = useForm<Component>({ 
    defaultValues: { id: idRef.current, ...defaultValues },
    mode: 'onChange'
  });
  const { register, handleSubmit, control, watch, getValues, trigger, formState: { errors } } = methods;
  const drawer = useDynamicDrawer();
  const router = useRouter();

  const [ready, elements] = elementStore.useList();
  const [componentHydrated, component] = componentStore.useGet(idRef.current);

  useEffect(() => {
    if (componentHydrated && component) {
      const originalId = component.id.includes('#') ? component.id.split('#')[0] : component.id;
      methods.reset({ ...(component as any), id: originalId });
    }
  }, [methods, componentHydrated, component]);

  useEffect(() => {
    // noop but preserves prior effect structure if needed later
  }, [id, ready]);

  // Autosave functionality
  const saveComponent = useCallback(
    async (data: Component, { auto = false }: { auto?: boolean } = {}) => {
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

  // Remove onSubmit since we're using autosave only
  // The form will automatically save as the user types

  return (
    <FormProvider {...methods}>
      <div className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name", { required: "Name is required" })}
          errors={errors}
        />
        <DynamicComboBox
          labelTitle="Element"
          name="elementId"
          control={control}
          rules={{ required: "Element is required" }}
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