"use client";

import { PrimaryBtn } from "@/app/app/components/Buttons";
import Input from "@/app/app/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import { componentStore, elementStore } from "@/app/app/clients/Database";
import type { Component } from "@/app/app/clients/Dexie";
import { useEffect, useState } from "react";
import { Schema } from "@/amplify/data/resource";
import { Combobox } from "@/app/app/components/Input/ComboBox";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { v4 as uuidv4 } from "uuid";

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<Component>;
  onSave?: () => void;
}

export function DataForm({ id, defaultValues, onSave }: DataFormProps) {
  const methods = useForm<Component>({ defaultValues: defaultValues });
  const { register, handleSubmit, control } = methods;
  const [isLoading, setIsLoading] = useState(true);
  const drawer = useDynamicDrawer();

  const [ready, elements] = elementStore.useList();

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          const data = await componentStore.get(id);
          methods.reset(data);
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

  const onSubmit = (data: Component) => {
    const saveData = async () => {
      try {
        if (!data.id) {
          await componentStore.add({
            id: uuidv4(),
            name: data.name,
            elementId: data.elementId,
            materials: data.materials
          });
        } else {
          await componentStore.update(data.id, (draft) => {
            draft.name = data.name;
            draft.elementId = data.elementId;
            draft.materials = data.materials;
          });
        }

        toast.success("Saved");
        drawer.closeDrawer();
        onSave && onSave();
      } catch (error) {
        console.error("Failed to save data", error);
        toast.error("Error unable to save data.");
      }
    };

    saveData();
  };

  if(isLoading) {
    return <div>Loading...</div>
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name", { required: true })}
        />
        <Combobox
          labelTitle="Element"
          name="elementId"
          control={control}
          rules={{ required: true }}
          data={elements.map((x) => ({ label: x.name, value: x.id }))}
        />
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
}