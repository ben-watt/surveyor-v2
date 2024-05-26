"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "@/app/components/Input/InputText";
import SelectBox from "@/app/components/Input/SelectBox";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { FormProvider, useForm } from "react-hook-form";
import { successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import reportClient from "@/app/clients/ReportsClient";

interface DefectFormData {
  name: string;
  description: string;
  cause: string;
  element: string;
  component: string;
}

export default function Page() {
  const form = useForm<DefectFormData>({});
  const { register, handleSubmit } = form;
  const router = useRouter();

  const onSubmit = (data: DefectFormData) => {
    const saveDefect = async () => {
      try {
        console.log(reportClient.models)
        await reportClient.models.Defects.create(data);
        successToast("Saved");
        router.push("/reports/defects");
      } catch (error) {
        console.error("Failed to save defect", error);
      }
    };

    saveDefect();
  };

  return (
    <div className="container mx-auto px-5">
      <div className="flex mt-4 mb-4">
        <h1 className="text-4xl dark:text-white">Create Defect</h1>
      </div>
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
            <option value="1">Walls</option>
            <option value="2">Floor</option>
            <option value="3">Ground</option>
          </SelectBox>
          <SelectBox
            labelTitle="Component"
            register={() => register("component", { required: true })}
          >
            <option value="1">Skylight</option>
            <option value="2">Floorboards</option>
            <option value="3">Others</option>
          </SelectBox>
          <PrimaryBtn className="w-full flex justify-center" type="submit">
            Save
          </PrimaryBtn>
        </form>
      </FormProvider>
    </div>
  );
}
