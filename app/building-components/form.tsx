"use client";

import { PrimaryBtn } from "@/app/components/Buttons";
import Input from "@/app/components/Input/InputText";
import {
  FormProvider,
  UseFieldArrayRemove,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { toast } from "@/app/components/Toasts";
import reportClient from "@/app/clients/AmplifyDataClient";
import { useEffect, useState } from "react";
import { Schema } from "@/amplify/data/resource";
import { Combobox } from "@/app/components/Input/ComboBox";
import { Button } from "@/components/ui/button";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { FormSection } from "../components/FormSection";

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
  const { register, handleSubmit } = methods;
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
  }, []);

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
        toast.basic(`Error unable to save data.`);
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
          controllerProps={{
            name: "elementId",
            rules: { required: true },
          }}
          data={elements.map((x) => ({ label: x.name, value: x.id }))}
        />
        <AddMaterials />
        <PrimaryBtn className="w-full flex justify-center" type="submit">
          Save
        </PrimaryBtn>
      </form>
    </FormProvider>
  );
}

const AddMaterials = () => {
  const { control } = useFormContext<ComponentDataUpdate>();
  const { append, remove, fields } = useFieldArray({
    control: control,
    name: "materials",
  });

  return (
    <>
      {fields.map((field, index) => (
        <ListMaterials
          key={field.id}
          field={field}
          index={index}
          remove={remove}
        />
      ))}
      <Button
        variant="secondary"
        onClick={() => append({ name: "", defects: [] })}
      >
        Add Material
      </Button>
    </>
  );
};

interface ListMaterialsProps {
  field: {
    name: string;
    defects: ({ name: string; description: string } | null)[];
  } & Record<"id", string>;
  index: number;
  remove: UseFieldArrayRemove;
}

const ListMaterials = ({ field, index, remove }: ListMaterialsProps) => {
  const { control, register } = useFormContext<ComponentDataUpdate>();
  const {
    append,
    remove: removeDefect,
    fields,
  } = useFieldArray({ control: control, name: `materials.${index}.defects` });

  return (
    <div key={field.id}>
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            labelTitle="Material Name"
            register={() =>
              register(`materials.${index}.name`, { required: true })
            }
          />
        </div>

        <Button
          className="h-full"
          variant="secondary"
          onClick={() => append({ name: "", description: "" })}
        >
          Add Defect
        </Button>
        <Button
          className="h-full"
          variant="destructive"
          onClick={() => remove(index)}
        >
          Remove
        </Button>
      </div>

      {fields.map((defect, defectIndex) => (
        <FormSection key={defectIndex}>
          <div className="grid gap-4 m-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input
                  key={defect.id}
                  labelTitle="Defect Name"
                  register={() =>
                    register(`materials.${index}.defects.${defectIndex}.name`, {
                      required: true,
                    })
                  }
                />
              </div>

              <Button
                variant="destructive"
                onClick={() => removeDefect(defectIndex)}
              >
                Remove
              </Button>
            </div>
            <TextAreaInput
              key={defect.id}
              labelTitle="Defect Description"
              register={() =>
                register(
                  `materials.${index}.defects.${defectIndex}.description`,
                  { required: true }
                )
              }
            />
          </div>
        </FormSection>
      ))}
    </div>
  );
};
