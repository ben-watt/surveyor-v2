"use client";

import { PrimaryBtn } from "@/app/home/components/Buttons";
import Input from "@/app/home/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { DynamicComboBox } from "../components/Input";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { elementStore, sectionStore, type CreateElement, type UpdateElement  } from "../clients/Database";
import { Element } from "../clients/Dexie";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { withTenantId } from "../utils/tenant-utils";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../components/LastSavedIndicator";


interface DataFormProps {
  id?: string;
}

export function DataForm({ id }: DataFormProps) {
  const form = useForm<Element>({
    mode: 'onChange' // Enable validation on change
  });
  const drawer = useDynamicDrawer();
  const [sectionsHydrated, sections] = sectionStore.useList();
  const router = useRouter();
  const { register, handleSubmit, control, watch, getValues, trigger, formState: { errors } } = form;

  const [entityData, setEntityData] = useState<Element | null>(null);

  useEffect(() => {
    if (id) {
      const fetch = async () => {
        try {
          const response = await elementStore.get(id);
          if (response) {
            form.reset(response);
            setEntityData(response);
            console.debug("fetched existing data", response);
          }
        } catch (error) {
          console.error("Failed to fetch element", error);
          toast.error("Failed to fetch element");
        }
      };

      fetch();
    }
  }, [form, id]);

  // Autosave functionality
  const saveElement = async (data: Element, { auto = false }: { auto?: boolean } = {}) => {
    console.debug("[DataForm] saveElement", { data, auto });
    
    try {
      if (!data.id) {
        await elementStore.add({
          id: uuidv4(),
          name: data.name,
          sectionId: data.sectionId,
          order: data.order,
          description: data.description,
        });
        if (!auto) toast.success("Created Element");
      } else {
        await elementStore.update(data.id, (draft) => {
          draft.name = data.name;
          draft.order = data.order;
          draft.sectionId = data.sectionId;
          draft.description = data.description;
        });
        if (!auto) toast.success("Updated Element");
      }
    } catch (error) {
      if (!auto) toast.error("Error saving element");
      console.error("Failed to save", error);
      throw error; // Re-throw for autosave error handling
    }
  };

  const { save, saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveElement,
    watch,
    getValues,
    trigger,
    {
      delay: 2000, // 2 second delay for autosave
      showToast: false, // Don't show toast for autosave
      enabled: !!id, // Only enable autosave for existing elements
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
        <Input
          labelTitle="Order"
          type="number"
          placeholder="order"
          defaultValue={1000}
          register={() => register("order", { required: "Order is required" })}
          errors={errors}
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