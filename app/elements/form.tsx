"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import Input from "@/app/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { basicToast, successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import reportClient from "@/app/clients/AmplifyDataClient";
import { useEffect } from "react";
import { Schema } from "@/amplify/data/resource";
import { Combobox } from "../components/Input/ComboBox";

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
      const fetch = async () => {
        try {
          const response = await reportClient.models.Elements.get({ id });
          form.reset(response.data as ElementsDataUpdate);
          console.debug("fetched existing data", response.data);
        } catch (error) {
          console.error("Failed to fetch defect", error);
        }
      };

      fetch();
    }
  }, [form, id]);

  const onSubmit = (data: ElementsDataUpdate) => {
    const save = async () => {
      try {
        if (!data.id) {
          await reportClient.models.Elements.create(data);
          successToast("Created Element");
        } else {
          await reportClient.models.Elements.update({
            id: data.id,
            name: data.name,
            order: data.order,
            section: data.section,
            description: data.description,
          });
          successToast("Updated Element");
        }

        router.push("/elements");
      } catch (error) {
        basicToast("Error");
        console.error("Failed to save", error);
      }
    };

    save();
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name", { required: "Name is required" })}
        />
        <Input
          labelTitle="Description"
          register={() => register("description")}
        />
        <Combobox
          labelTitle="Section"
          data={[
            { value: "External Condition of Property", label: "External Condition of Property" },
            { value: "Internal Condition of Property", label: "Internal Condition of Property" },
            { value: "Sevices", label: "Sevices" },
            { value: "Grounds (External Areas)", label: "Grounds (External Areas)" },
          ]}
          controllerProps={{
            name: "section",
            rules: { required: "Section is required" },
          }}
        />
        <Input
          labelTitle="Order"
          type="number"
          placeholder="order"
          defaultValue={1000}
          register={() => register("order", { required: "Order is required" })}
        />
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
}
