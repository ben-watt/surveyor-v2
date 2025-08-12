"use client";

import { PrimaryBtn } from "@/app/home/components/Buttons";
import Input from "@/app/home/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { DynamicComboBox } from "@/app/home/components/Input";
import { Phrase } from "../clients/Dexie";
import TextAreaInput from "../components/Input/TextAreaInput";
import { componentStore, elementStore, phraseStore } from "../clients/Database";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useAutoSaveForm } from "../hooks/useAutoSaveForm";
import { LastSavedIndicator } from "../components/LastSavedIndicator";

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
  const methods = useForm<UpdateForm>({ 
    defaultValues: defaultValues,
    mode: 'onChange' // Enable validation on change
  });
  const { register, control, watch, getValues, trigger, formState: { errors } } = methods;
  const [elementsHydrated, elements] = elementStore.useList();
  const [componentsHydrated, components] = componentStore.useList();
  const [entityData, setEntityData] = useState<Phrase | null>(null);
  const [isCreated, setIsCreated] = useState<boolean>(!!id);

  useEffect(() => {
    const load = async () => {  
      if(id) {
        const phrase = await phraseStore.get(id);
        if(phrase) {
          methods.reset(phrase);
          setEntityData(phrase);
        }
      }
    }

    load();
  }, [id, methods]);

  // Autosave functionality
  const savePhrase = async (data: UpdateForm, { auto = false }: { auto?: boolean } = {}) => {
    try {
      if (!isCreated || !(data as any)?.id) {
        const newId = uuidv4();
        await phraseStore.add({
          id: newId,
          name: data.name,
          type: "condition",
          phrase: data.phrase,
          phraseLevel2: data.phraseLevel2,
          associatedElementIds: data.associatedElementIds ?? [],
          associatedComponentIds: data.associatedComponentIds ?? [],
          associatedMaterialIds: data.associatedMaterialIds ?? [],
        });
        methods.reset({ ...(data as any), id: newId });
        setIsCreated(true);
        if (!auto) toast.success("Phrase created");
      } else {
        const currentId = (data as any).id as string;
        await phraseStore.update(currentId, (draft) => {
          draft.name = data.name;
          draft.type = "condition";
          draft.phrase = data.phrase;
          draft.phraseLevel2 = data.phraseLevel2;
          draft.associatedElementIds = data.associatedElementIds;
          draft.associatedComponentIds = data.associatedComponentIds;
        });
        if (!auto) toast.success("Phrase updated");
      }

      if (!auto) onSave?.();
    } catch (error) {
      console.error("Failed to save phrase", error);
      if (!auto) toast.error("Error saving phrase");
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    savePhrase,
    watch,
    getValues,
    trigger,
    {
      delay: 2000, // 2 second delay for autosave
      showToast: false, // Don't show toast for autosave
      enabled: true, // Enable autosave for both new and existing phrases
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
          register={() => register("name", { required: "Name is required" })}
          errors={errors}
        />
        <TextAreaInput
          labelTitle="Phrase (Level 3)"
          register={() => register("phrase", { required: "Phrase is required" })}
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
          entityUpdatedAt={entityData?.updatedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}