"use client";

import Input from "@/app/home/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { DynamicComboBox } from "@/app/home/components/Input";
import { Phrase } from "../clients/Dexie";
import TextAreaInput from "../components/Input/TextAreaInput";
import { componentStore, elementStore, phraseStore } from "../clients/Database";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from 'uuid';
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../components/LastSavedIndicator";
import { getAutoSaveTimings } from "../utils/autosaveTimings";

// Zod schema for condition/phrase validation
const conditionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  phrase: z.string().min(1, "Phrase is required"),
  phraseLevel2: z.string().nullable().optional(),
  associatedElementIds: z.array(z.string()).transform(val => val || []),
  associatedComponentIds: z.array(z.string()).transform(val => val || []),
  associatedMaterialIds: z.array(z.string()).transform(val => val || [])
});

type ConditionFormData = z.infer<typeof conditionSchema>;

type UpdateForm = Omit<
  Phrase,
  "createdAt" | "updatedAt" | "element" | "owner"
>;

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<UpdateForm>;
  onSave?: () => void;
}

export function DataForm({ id, defaultValues, onSave }: DataFormProps) {
  const idRef = useRef(id ?? uuidv4());
  const methods = useForm<ConditionFormData>({ 
    defaultValues: { 
      id: idRef.current, 
      name: "",
      phrase: "",
      phraseLevel2: undefined,
      associatedElementIds: [],
      associatedComponentIds: [],
      associatedMaterialIds: [],
      ...defaultValues 
    },
    mode: 'onChange'
  });
  const { register, control, watch, getValues, trigger, formState: { errors } } = methods;
  const [elementsHydrated, elements] = elementStore.useList();
  const [componentsHydrated, components] = componentStore.useList();
  const [phraseHydrated, phrase] = phraseStore.useGet(idRef.current);

  // Track if we've done the initial reset to prevent wiping user input on autosave
  const [hasInitialReset, setHasInitialReset] = useState(false);

  useEffect(() => {
    if (phraseHydrated && phrase && !hasInitialReset) {
      // Only reset on initial load, not on subsequent updates from autosave
      methods.reset({
        id: phrase.id,
        name: phrase.name ?? '',
        phrase: phrase.phrase ?? '',
        phraseLevel2: phrase.phraseLevel2 ?? undefined,
        associatedElementIds: phrase.associatedElementIds ?? [],
        associatedComponentIds: phrase.associatedComponentIds ?? []
      } as any, { keepIsValid: true });
      setHasInitialReset(true);
    }
  }, [phraseHydrated, phrase, methods, hasInitialReset]);

  // Autosave functionality
  const savePhrase = useCallback(
    async (data: ConditionFormData, { auto = false }: { auto?: boolean } = {}) => {
      try {
        if (phraseHydrated && phrase) {
          await phraseStore.update(idRef.current, draft => {
            draft.name = data.name;
            draft.type = "condition";
            draft.phrase = data.phrase;
            draft.phraseLevel2 = data.phraseLevel2;
            draft.associatedElementIds = data.associatedElementIds ?? [];
            draft.associatedComponentIds = data.associatedComponentIds ?? [];
            draft.associatedMaterialIds = data.associatedMaterialIds ?? [];
          });
          if (!auto) toast.success("Phrase updated");
        } else {
          await phraseStore.add({
            id: idRef.current,
            name: data.name,
            type: "condition",
            phrase: data.phrase,
            phraseLevel2: data.phraseLevel2,
            associatedElementIds: data.associatedElementIds ?? [],
            associatedComponentIds: data.associatedComponentIds ?? [],
            associatedMaterialIds: data.associatedMaterialIds ?? [],
          });
          if (!auto) toast.success("Phrase created");
        }
        if (!auto) onSave?.();
      } catch (error) {
        console.error("Failed to save phrase", error);
        if (!auto) toast.error("Error saving phrase");
        throw error; // Re-throw for autosave error handling
      }
    },
    [phraseHydrated, phrase, onSave]
  );

  const timings = getAutoSaveTimings(2000);
  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    savePhrase,
    watch,
    getValues,
    trigger,
    {
      delay: timings.delay,
      watchDelay: timings.watchDelay,
      showToast: false, // Don't show toast for autosave
      enabled: phraseHydrated,
      validateBeforeSave: true // Enable validation before auto-save
    }
  );

  if(!elementsHydrated || !componentsHydrated) {
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
        <TextAreaInput
          labelTitle="Phrase (Level 3)"
          register={() => register("phrase")}
          errors={errors}
        />
        <TextAreaInput
          labelTitle="Phrase (Level 2)"
          placeholder="Simpler wording for Level 2 surveys"
          register={() => register("phraseLevel2")}
          errors={errors}
        />
        <DynamicComboBox
          labelTitle="Associated Elements"
          name="associatedElementIds"
          control={control}
          data={elements.map((x) => ({ label: x.name, value: x.id }))}
          isMulti={true}
          errors={errors}
        />
        <DynamicComboBox
          labelTitle="Associated Components"
          name="associatedComponentIds"
          control={control}
          data={components.map((x) => ({ label: x.name, value: x.id }))}
          isMulti={true}
          errors={errors}
        />
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt || undefined}
          entityUpdatedAt={phrase?.updatedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}