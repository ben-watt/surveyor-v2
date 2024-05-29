"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "@/app/components/Input/InputText";
import SelectBox from "@/app/components/Input/SelectBox";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { FormProvider, useForm } from "react-hook-form";
import { basicToast, successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import reportClient from "@/app/clients/ReportsClient";
import { useEffect } from "react";

interface DefectFormData {
  id: string;
  name: string;
  description: string;
  cause: string;
  element: string;
  component: string;
}

interface DefectFormProps {
  id?: string;
}

export function DefectForm({ id }: DefectFormProps) {
  const form = useForm<DefectFormData>({});
  const { register, handleSubmit } = form;
  const router = useRouter();

  useEffect(() => {
    if (id) {
      const fetchDefect = async () => {
        try {
          const response = await reportClient.models.Defects.get({ id });
          form.reset(response.data as DefectFormData);
        } catch (error) {
          console.error("Failed to fetch defect", error);
        }
      };

      fetchDefect();
    }
  }, [id]);

  const onSubmit = (data: DefectFormData) => {
    const saveDefect = async () => {
      try {
        if (!data.id) {
          await reportClient.models.Defects.create(data);
        } else {
          await reportClient.models.Defects.update({
            id: data.id,
            name: data.name,
            description: data.description,
            cause: data.cause,
            element: data.element,
            component: data.component,
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
        <InputText
          labelTitle="Name"
          register={() => register("name", { required: true })}
        />
        <TextAreaInput
          labelTitle="Description"
          placeholder="Description"
          register={() => register("description")}
        />
        <TextAreaInput
          labelTitle="Casuse"
          placeholder="Cause"
          register={() => register("cause")}
        />
        <SelectBox
          labelTitle="Element"
          register={() => register("element", { required: true })}
        >
          <option value="walls">Walls</option>
          <option value="floor">Floor</option>
          <option value="ground">Ground</option>
        </SelectBox>
        <SelectBox
          labelTitle="Component"
          register={() => register("component", { required: true })}
        >
          <option value="skylight">Skylight</option>
          <option value="floorboards">Floorboards</option>
          <option value="other">Others</option>
        </SelectBox>
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
}
