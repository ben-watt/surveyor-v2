"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import Input from "@/app/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { Combobox } from "@/app/components/Input/ComboBox";
import { Phrase } from "../clients/Dexie";
import TextAreaInput from "../components/Input/TextAreaInput";
import { componentStore, elementStore, phraseStore } from "../clients/Database";
import toast from "react-hot-toast";
import { useEffect } from "react";

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
        draft.type = data.type;
        draft.phrase = data.phrase;
        draft.associatedElementIds = data.associatedElementIds;
        draft.associatedComponentIds = data.associatedComponentIds;
      });
      toast.success("Phrase updated");
    } else {
      await phraseStore.add(data);
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
        <Combobox   
          labelTitle="Type"
          name="type"
          control={control}
          rules={{ required: true }}
          data={["Defect", "Condition"].map((x) => ({ label: x, value: x }))}
        />
        <TextAreaInput
          labelTitle="Phrase"
          register={() => register("phrase", { required: true })}
        />
        <Combobox
          labelTitle="Associated Elements"
          name="elementId"
          control={control}
          data={elements.map((x) => ({ label: x.name, value: x.id }))}
          isMulti={true}
        />
        <Combobox
          labelTitle="Associated Components"
          name="componentId"
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