"use client";

import { PrimaryBtn } from "@/app/home/components/Buttons";
import Input from "@/app/home/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { Combobox } from "@/app/home/components/Input/ComboBox";
import { Phrase } from "../clients/Dexie";
import TextAreaInput from "../components/Input/TextAreaInput";
import { componentStore, elementStore, phraseStore } from "../clients/Database";
import toast from "react-hot-toast";
import { useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

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
  const methods = useForm<UpdateForm>({ defaultValues: defaultValues });
  const { register, handleSubmit, control, watch } = methods;
  const [elementsHydrated, elements] = elementStore.useList();
  const [componentsHydrated, components] = componentStore.useList();

  useEffect(() => {
    const load = async () => {  
      if(id) {
        const phrase = await phraseStore.get(id);
        methods.reset(phrase);
      }
    }

    load();
  }, [id, methods]);

  const onSubmit = async (data: UpdateForm) => {

    
    if(id) {
      await phraseStore.update(id, (draft) => {
        draft.name = data.name;
        draft.type = "condition";
        draft.phrase = data.phrase;
        draft.associatedElementIds = data.associatedElementIds;
        draft.associatedComponentIds = data.associatedComponentIds;
      });
      toast.success("Phrase updated");
    } else {
      await phraseStore.add({
        id: uuidv4(),
        name: data.name,
        type: "condition",
        phrase: data.phrase,
        associatedElementIds: data.associatedElementIds ?? [],
        associatedComponentIds: data.associatedComponentIds ?? [],
        associatedMaterialIds: data.associatedMaterialIds ?? [],
      });
      toast.success("Phrase created");
    }

    onSave?.();
  };

  if(!elementsHydrated || !componentsHydrated) {
    return <div>Loading...</div>;
  }

  console.log("[form]", watch());

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name", { required: true })}
        />
        <TextAreaInput
          labelTitle="Phrase"
          register={() => register("phrase", { required: true })}
        />
        <Combobox
          labelTitle="Associated Elements"
          name="associatedElementIds"
          control={control}
          data={elements.map((x) => ({ label: x.name, value: x.id }))}
          isMulti={true}
        />
        <Combobox
          labelTitle="Associated Components"
          name="associatedComponentIds"
          control={control}
          data={components.map((x) => ({ label: x.name, value: x.id }))}
          isMulti={true}
        />
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
}