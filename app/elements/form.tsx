"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import Input from "@/app/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Combobox } from "../components/Input/ComboBox";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { elementStore, type CreateElement, type UpdateElement } from "../clients/Database";
import { Element } from "../clients/Dexie";
import { v4 as uuidv4 } from "uuid";

interface DataFormProps {
  id?: string;
}

export function DataForm({ id }: DataFormProps) {
  const form = useForm<Element>({});
  const drawer = useDynamicDrawer();
  const { register, handleSubmit, control } = form;

  useEffect(() => {
    if (id) {
      const fetch = async () => {
        try {
          const response = await elementStore.get(id);
          form.reset(response);
          console.debug("fetched existing data", response);
        } catch (error) {
          console.error("Failed to fetch element", error);
          toast.error("Failed to fetch element");
        }
      };

      fetch();
    }
  }, [form, id]);

  const onSubmit = (data: Element) => {
    const save = async () => {
      try {
        if (!data.id) {
          await elementStore.add({
            id: uuidv4(),
            name: data.name,
            section: data.section,
            order: data.order,
            description: data.description,
          });
          toast.success("Created Element");
        } else {
          await elementStore.update(data.id, (draft) => {
            draft.name = data.name;
            draft.order = data.order;
            draft.section = data.section;
            draft.description = data.description;
          });
          toast.success("Updated Element");
        }
      } catch (error) {
        toast.error("Error saving element");
        console.error("Failed to save", error);
      } finally {
        drawer.closeDrawer();
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
          name="section"
          control={control}
          rules={{ required: "Section is required" }}
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