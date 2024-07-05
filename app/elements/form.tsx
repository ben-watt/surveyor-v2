"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "@/app/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { basicToast, successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import reportClient from "@/app/clients/ReportsClient";
import { useEffect } from "react";
import { Schema } from "@/amplify/data/resource";
import { Input } from "@/components/ui/input";

type ElementsData = Schema["Elements"]["type"];
type ElementsDataUpdate = Omit<ElementsData, "createdAt" | "updatedAt">;

interface DataFormProps {
  id?: string;
}

export function DataForm({ id }: DataFormProps) {
  const form = useForm<ElementsDataUpdate>({});
  const { register, handleSubmit } = form;
  const router = useRouter();

  useEffect(() => {
    if (id) {
      const fetchDefect = async () => {
        try {
          const response = await reportClient.models.Elements.get({ id });
          form.reset(response.data as ElementsDataUpdate);
          console.debug("existing Data", response.data);
        } catch (error) {
          console.error("Failed to fetch defect", error);
        }
      };

      fetchDefect();
    }
  }, [id]);

  const onSubmit = (data: ElementsDataUpdate) => {
    const saveDefect = async () => {
      try {
        if (!data.id) {
          await reportClient.models.Elements.create(data);
        } else {
          await reportClient.models.Elements.update({
            id: data.id,
            name: data.name,
            priority: data.priority,
            description: data.description,          
          });
        }

        successToast("Saved");
        router.push("/elements");
      } catch (error) {
        basicToast("Error");
        console.error("Failed to save", error);
      }
    };

    saveDefect();
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <InputText
          labelTitle="Name"
          register={() => register("name", { required: "Name is required" })}
        />
        <InputText
          labelTitle="Description"
          register={() => register("description")}
        />
        <div>
          <Input
            type="number"
            placeholder="priority"
            defaultValue={1000}
            {...register("priority", { required: "priority is required" })}
          />
        </div>
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
}
