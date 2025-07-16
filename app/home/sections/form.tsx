"use client";

import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Section as SectionData } from "@/app/home/clients/Dexie";
import { sectionStore } from "../clients/Database";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../components/LastSavedIndicator";
import InputError from "../components/InputError";
import toast from "react-hot-toast";

interface SectionFormProps {
  initialData?: SectionData;
}

export default function SectionForm({ initialData }: SectionFormProps) {
  const router = useRouter();
  const [entityData, setEntityData] = useState<SectionData | null>(null);
  
  const form = useForm<SectionData>({
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      name: "",
      order: 0,
    },
    mode: 'onChange' // Enable validation on change
  });

  const { register, watch, getValues, trigger, formState: { errors } } = form;

  useEffect(() => {
    if (initialData) {
      setEntityData(initialData);
    }
  }, [initialData]);

  // Autosave functionality
  const saveSection = async (data: SectionData, { auto = false }: { auto?: boolean } = {}) => {
    try {
      if (initialData) {
        await sectionStore.update(data.id, (currentState) => {
          return { ...currentState, ...data };
        });
        if (!auto) toast.success("Section updated successfully");
      } else {
        await sectionStore.add(data);
        if (!auto) {
          toast.success("Section created successfully");
          router.push("/home/sections");
        }
      }
    } catch (error) {
      console.error("Failed to save section", error);
      if (!auto) toast.error("Error saving section");
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveSection,
    watch,
    getValues,
    trigger,
    {
      delay: 500, // 0.5 second delay for autosave
      showToast: false, // Don't show toast for autosave
      enabled: !!initialData, // Only enable autosave for existing sections
      validateBeforeSave: true // Enable validation before auto-save
    }
  );

  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Name is required" })}
            placeholder="Enter section name"
          />
          {errors.name && <InputError message={errors.name.message} />}
        </div>

        <div>
          <Label htmlFor="order">Order</Label>
          <Input
            id="order"
            type="number"
            {...register("order", { valueAsNumber: true, required: "Order is required" })}
            placeholder="Enter display order"
          />
          {errors.order && <InputError message={errors.order.message} />}
        </div>

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