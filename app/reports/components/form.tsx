"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "@/app/components/Input/InputText";
import SelectBox from "@/app/components/Input/SelectBox";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { basicToast, successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import reportClient from "@/app/clients/ReportsClient";
import { useEffect } from "react";
import { Schema } from "@/amplify/data/resource";

type ComponentData = Schema["Components"]["type"];
type ComponentDataUpdate = Omit<ComponentData, "createdAt" | "updatedAt">;

interface DefectFormProps {
  id?: string;
}

export function DefectForm({ id }: DefectFormProps) {
  const form = useForm<ComponentDataUpdate>({});
  const { register, handleSubmit, control } = form;
  const { append, fields } = useFieldArray({ control: control, name: "defects" });
  const router = useRouter();

  useEffect(() => {
    if (id) {
      const fetchDefect = async () => {
        try {
          const response = await reportClient.models.Components.get({ id });
          form.reset(response.data as ComponentDataUpdate);
        } catch (error) {
          console.error("Failed to fetch defect", error);
        }
      };

      fetchDefect();
    }
  }, [id]);

  const onSubmit = (data: ComponentDataUpdate) => {
    const saveDefect = async () => {
      try {
        if (!data.id) {
          await reportClient.models.Components.create(data);
        } else {
          await reportClient.models.Components.update({
            id: data.id,
            name: data.name,
          });
        }

        successToast("Saved");
        router.push("/reports/defects");
      } catch (error) {
        basicToast("Error");
        console.error("Failed to save defect", error);
      }
    };

    saveDefect();
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <SelectBox
          labelTitle="Element"
          register={() => register("element", { required: true })}
        >
          <option value="walls">Walls</option>
          <option value="floor">Floor</option>
          <option value="ground">Ground</option>
        </SelectBox>
        <InputText
          labelTitle="Type"
          register={() => register("type", { required: true })}
        />
        <InputText
          labelTitle="Name"
          register={() => register("name", { required: true })}
        />        
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
}
