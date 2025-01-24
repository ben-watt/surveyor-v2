"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import client from "@/app/clients/AmplifyDataClient";
import { SyncStatus, Section as SectionData } from "@/app/clients/Dexie";

interface SectionFormProps {
  initialData?: SectionData;
}

export default function SectionForm({ initialData }: SectionFormProps) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<SectionData>({
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      name: "",
      order: 0,
      syncStatus: SyncStatus.Queued,
    },
  });

  const onSubmit = async (data: SectionData) => {
    try {
      if (initialData) {
        await client.models.Sections.update(data);
      } else {
        await client.models.Sections.create(data);
      }
      router.push("/sections");
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register("name", { required: "Name is required" })}
          placeholder="Enter section name"
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="order">Order</Label>
        <Input
          id="order"
          type="number"
          {...register("order", { valueAsNumber: true })}
          placeholder="Enter display order"
        />
      </div>

      <div>
        <Button className="w-full" variant="default" type="submit">
          {initialData ? "Update" : "Create"} Section
        </Button>
      </div>
    </form>
  );
} 