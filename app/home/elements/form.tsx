"use client";

import { PrimaryBtn } from "@/app/home/components/Buttons";
import Input from "@/app/home/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect } from "react";
import { Combobox } from "../components/Input/ComboBox";
import toast from "react-hot-toast";
import { useDynamicDrawer } from "../components/Drawer";
import { elementStore, sectionStore, type CreateElement, type UpdateElement  } from "../clients/Database";
import { Element } from "../clients/Dexie";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { withTenantId } from "../utils/tenant-utils";


interface DataFormProps {
  id?: string;
}

export function DataForm({ id }: DataFormProps) {
  const form = useForm<Element>({});
  const drawer = useDynamicDrawer();
  const [sectionsHydrated, sections] = sectionStore.useList();
  const router = useRouter();
  const { register, handleSubmit, control } = form;

  useEffect(() => {
    if (id) {
      const fetch = async () => {
        try {
          const response = await elementStore.get(id);
          if (response) {
            form.reset(response);
            console.debug("fetched existing data", response);
          }
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
      console.debug("[DataForm] onSubmit", data);
      
      try {
        if (!data.id) {
          await elementStore.add({
            id: uuidv4(),
            name: data.name,
            sectionId: data.sectionId,
            order: data.order,
            description: data.description,
          });
          toast.success("Created Element");
        } else {
          await elementStore.update(data.id, (draft) => {
            draft.name = data.name;
            draft.order = data.order;
            draft.sectionId = data.sectionId;
            draft.description = data.description;
          });
          toast.success("Updated Element");
        }
      } catch (error) {
        toast.error("Error saving element");
        console.error("Failed to save", error);
      }

      router.push('/home/elements')
    };

    save();
  };

  if(!sectionsHydrated) {
    return <div>Loading...</div>
  }

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
          data={sections.map(s => ({ value: s.id, label: s.name }))}
          name="sectionId"
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