"use client";

import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Section as SectionData } from "@/app/home/clients/Dexie";
import { sectionStore } from "../clients/Database";
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { getAutoSaveTimings } from "../utils/autosaveTimings";
import { LastSavedIndicator } from "../components/LastSavedIndicator";
import InputError from "../components/InputError";
import toast from "react-hot-toast";

// Zod schema for section validation
const sectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  order: z.number().min(0, "Order must be 0 or greater").nullable().optional()
});

type SectionFormData = z.infer<typeof sectionSchema>;

interface SectionFormProps {
  initialData?: SectionData;
}

export default function SectionForm({ initialData }: SectionFormProps) {
  const router = useRouter();
  const idRef = React.useRef(initialData?.id ?? uuidv4())
  const [isHydrated, section] = sectionStore.useGet(idRef.current);
  
  const form = useForm<SectionFormData>({
    defaultValues: {
      id: initialData?.id ?? idRef.current,
      name: initialData?.name ?? "",
      order: initialData?.order ?? 0,
    },
    mode: 'onChange'
  });

  const { register, watch, getValues, trigger, formState: { errors } } = form;

  // Autosave functionality
  const saveSection = async (data: SectionFormData, { auto = false }: { auto?: boolean } = {}) => {
    try {
      if (isHydrated && section) {
        await sectionStore.update(data.id, (draft) => {
          draft.name = data.name;
          draft.order = data.order;
        });
        console.debug("[saveSection] Section updated", data);
        if (!auto) toast.success("Section updated successfully");
      } else {
        await sectionStore.add(data);
        console.debug("[saveSection] Section created", data);
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

  const timings = getAutoSaveTimings();
  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveSection,
    watch,
    getValues,
    trigger,
    {
      delay: timings.delay,
      watchDelay: timings.watchDelay,
      showToast: false, // Don't show toast for autosave
      enabled: isHydrated, // Enable autosave for both new and existing sections
      validateBeforeSave: true // Enable validation before auto-save
    }
  );

  return (
    <FormProvider {...form}>
      {isHydrated && (
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name", { 
              required: "Name is required",
              validate: (value) => sectionSchema.shape.name.safeParse(value).success || "Name is required"
            })}
            placeholder="Enter section name"
          />
          {errors.name && <InputError message={errors.name.message} />}
        </div>

        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt || undefined}
          entityUpdatedAt={section?.updatedAt}
          className="text-sm justify-center"
          />
        </div>
      )}
    </FormProvider>
  );
} 