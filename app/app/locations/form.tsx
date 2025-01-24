"use client";

import React, { useMemo } from "react";
import { PrimaryBtn } from "@/app/app/components/Buttons";
import Input from "@/app/app/components/Input/InputText";
import { FormProvider, useForm } from "react-hook-form";
import { Combobox } from "@/app/app/components/Input/ComboBox";
import { Location } from "../clients/Dexie";
import { buildLocationTree, locationStore } from "../clients/Database";
import toast from "react-hot-toast";
import { useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<Location>;
  onSave?: () => void;
}

export function DataForm({ id, defaultValues, onSave }: DataFormProps) {
  const methods = useForm<Location>({ defaultValues: defaultValues });
  const { register, handleSubmit, control } = methods;
  const [isHydrated, locations] = locationStore.useList();

  useEffect(() => {
    const load = async () => {
      if (id) {
        const location = await locationStore.get(id);
        methods.reset({
          id: location.id,
          name: location.name,
          parentId: location.parentId || undefined,
        });
      }
    };

    load();
  }, [id, methods]);

  const onSubmit = async (data: Location) => {
    if (id) {
      await locationStore.update(id, (draft) => {
        draft.name = data.name;
        draft.parentId = data.parentId;
      });
      toast.success("Location updated");
    } else {
      await locationStore.add({
        id: uuidv4(),
        name: data.name,
        parentId: data.parentId,
      });
      toast.success("Location created");
    }

    onSave?.();
  };

  const parentLocations = useMemo(() => {
    return buildLocationTree(locations);
  }, [locations]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Input
          labelTitle="Name"
          register={() => register("name", { required: true })}
        />
        <Combobox
          labelTitle="Parent Location"
          name="parentId"
          control={control}
          data={parentLocations}
        />
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
} 