"use client";

import { PrimaryBtn } from "@/app/home/components/Buttons";
import Input from "@/app/home/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { componentStore, elementStore } from "@/app/home/clients/Database";
import type { Component } from "@/app/home/clients/Dexie";
import { useEffect, useState } from "react";
import { Schema } from "@/amplify/data/resource";
import { Combobox } from "@/app/home/components/Input/ComboBox";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../components/LastSavedIndicator";

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<Component>;
}

export function DataForm({ id, defaultValues }: DataFormProps) {
  const methods = useForm<Component>({ 
    defaultValues: defaultValues,
    mode: 'onChange' // Enable validation on change
  });
  const { register, handleSubmit, control, watch, getValues, trigger, formState: { errors } } = methods;
  const [isLoading, setIsLoading] = useState(true);
  const [entityData, setEntityData] = useState<Component | null>(null);
  const drawer = useDynamicDrawer();
  const router = useRouter();

  const [ready, elements] = elementStore.useList();

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          const data = await componentStore.get(id);
          if(data) {
            methods.reset(data);
            setEntityData(data);
          }
          setIsLoading(false);
        } catch (error) {
          console.error("Failed to fetch data", error);
        }
      };

      fetchData();
    }
  }, [methods, id]);

  useEffect(() => {
    if (!id && ready) {
      setIsLoading(false);
    }
  }, [id, ready]);

  // Autosave functionality
  const saveComponent = async (data: Component, { auto = false }: { auto?: boolean } = {}) => {
    try {
      if (!data.id) {
        await componentStore.add({
          id: uuidv4(),
          name: data.name,
          elementId: data.elementId,
          materials: data.materials,
        });
      } else {
        await componentStore.update(data.id, (draft) => {
          draft.name = data.name;
          draft.elementId = data.elementId;
          draft.materials = data.materials;
        });
      }

      if (!auto) {
        toast.success("Saved");
        if(drawer.isOpen) {
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
  };

  const { save, saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveComponent,
    watch,
    getValues,
    trigger,
    {
      delay: 2000, // 2 second delay for autosave
      showToast: false, // Don't show toast for autosave
      enabled: !!id, // Only enable autosave for existing components
      validateBeforeSave: true // Enable validation before auto-save
    }
  );

  // Remove onSubmit since we're using autosave only
  // The form will automatically save as the user types

  if(isLoading) {
    return <div>Loading...</div>
  }

  return (
    <FormProvider {...methods}>
      <div className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name", { required: "Name is required" })}
          errors={errors}
        />
        <Combobox
          labelTitle="Element"
          name="elementId"
          control={control}
          rules={{ required: "Element is required" }}
          data={elements.map((x) => ({ label: x.name, value: x.id }))}
        />
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt || undefined}
          entityUpdatedAt={entityData?.updatedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}