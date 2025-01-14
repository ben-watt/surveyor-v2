"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import Input from "@/app/components/Input/InputText";
import {
  FormProvider,
  useForm,
} from "react-hook-form";
import reportClient from "@/app/clients/AmplifyDataClient";
import { useEffect, useState } from "react";
import { Schema } from "@/amplify/data/resource";
import { Combobox } from "@/app/components/Input/ComboBox";
import toast from "react-hot-toast";

type ComponentData = Schema["Components"]["type"];
type ComponentDataUpdate = Omit<
  ComponentData,
  "createdAt" | "updatedAt" | "element" | "owner"
>;

interface DataFormProps {
  id?: string;
  defaultValues?: ComponentDataUpdate;
  onSave?: () => void;
}

export function DataForm({ id, defaultValues, onSave }: DataFormProps) {
  const methods = useForm<ComponentDataUpdate>({ defaultValues: defaultValues });
  const { register, handleSubmit, control } = methods;
  const [isLoading, setIsLoading] = useState(true);

  const [elements, setElements] = useState<Schema["Elements"]["type"][]>([]);

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          const response = await reportClient.models.Components.get({ id });
          console.log(response.data);
          methods.reset(response.data as ComponentDataUpdate);
          setIsLoading(false);
        } catch (error) {
          console.error("Failed to fetch data", error);
        }
      };

      fetchData();
    }
  }, [methods, id]);

  useEffect(() => {
    const fetchElements = async () => {
      try {
        const response = await reportClient.models.Elements.list();
        setElements(response.data);

        if(!id) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch elements", error);
      }
    };

    fetchElements();
  }, [id]);

  const onSubmit = (data: ComponentDataUpdate) => {
    const saveData = async () => {
      try {
        if (!data.id) {
          await reportClient.models.Components.create(data);
        } else {
          await reportClient.models.Components.update({
            id: data.id,
            name: data.name,
            elementId: data.elementId,
            materials: data.materials,
          });
        }

        toast.success("Saved");
      } catch (error) {
        console.error("Failed to save data", error);
        toast.custom(`Error unable to save data.`);
      }

      onSave && onSave();
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