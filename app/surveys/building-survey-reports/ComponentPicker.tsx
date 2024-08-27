import React, { useEffect, useState } from "react";

import {
  Defect,
  RagStatus,
} from "./BuildingSurveyReportSchema";

import {
  Controller,
  useFormContext,
  useFieldArray,
} from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import Input from "../../components/Input/InputText";
import InputError from "@/app/components/InputError";
import reportClient from "@/app/clients/AmplifyDataClient";
import { Pencil, X } from "lucide-react";
import { Combobox } from "@/app/components/Input/ComboBox";
import { Button } from "@/components/ui/button";
import { Schema } from "@/amplify/data/resource";
import { SelectionSet } from "aws-amplify/api";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@radix-ui/react-select";
import { DynamicDrawer } from "@/app/components/Drawer";
import { DefectCheckbox } from "./DefectPicker";

interface ComponentPickerProps {
  name: string;
  elementId: string;
}

const componentDataSelectList = [
  "id",
  "name",
  "materials.*",
  "elementId",
] as const;
type ComponentData = SelectionSet<
  Schema["Components"]["type"],
  typeof componentDataSelectList
>;
type ComponentDataWithChild = ComponentData & {
  readonly materials: { readonly defects: Schema["Defect"]["type"][] }[];
};

export const ComponentPicker = ({ name, elementId }: ComponentPickerProps) => {
  const typedName = name as `sections.0.elementSections.0.materialComponents`;
  const { control, register, watch, setValue, getValues, formState } =
    useFormContext();
  const { fields, remove, append } = useFieldArray({
    name: typedName,
    control: control,
    shouldUnregister: true,
    rules: {
      required: true,
      validate: (v) => v.length > 0,
    },
  });

  const [comboBoxProps, setComboBoxProps] = useState<
    { label: string; value: string }[]
  >([]);

  const [addNew, setAddNew] = useState(true);

  const [components, setComponents] = useState<ComponentDataWithChild[]>([]);

  useEffect(() => {
    const props = mapToComboBoxProps(
      components.filter((c) => c.elementId === elementId)
    );
    setComboBoxProps(props);
  }, [components, elementId]);

  function mapToComboBoxProps(
    data: ComponentDataWithChild[]
  ): { label: string; value: string }[] {
    return data.flatMap((c) =>
      c.materials
        .map((m) => ({
          label: `${c.name} • ${m!.name}`,
          value: `${c.name}_${m!.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    );
  }

  useEffect(() => {
    async function fetchData() {
      const availableComponents = await reportClient.models.Components.list({
        selectionSet: componentDataSelectList,
      });

      if (availableComponents.data) {
        setComponents(availableComponents.data as ComponentDataWithChild[]);
      }
    }

    fetchData();
  }, []);

  function addMaterialComponent(
    ev: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    ev.preventDefault();
    append(
      {
        id: "",
        name: "",
        ragStatus: "N/I",
        defects: [],
        useNameOveride: false,
      },
      { shouldFocus: true }
    );
  }

  function getDefectsFor(materialComponentName: string): Defect[] {
    const [componentName, materialName] = materialComponentName.split("_");
    const component = components.find((c) => c.name === componentName);

    if (!component) {
      return [];
    }

    const material = component.materials.find(
      (m) => m!.name == materialName
    ) as Schema["Material"]["type"];

    if (!material) {
      return [];
    }

    return material.defects as Defect[];
  }

  const mapValueToColor = (value: RagStatus) => {
    switch (value) {
      case "Red":
        return "bg-red-400";
      case "Amber":
        return "bg-yellow-400";
      case "Green":
        return "bg-green-400";
      default:
        return "bg-gray-400";
    }
  };

  if (components.length === 0) {
    return (
      <>
        <Button className="w-full" variant="secondary" disabled>
          Loading Material Components...
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {addNew && <DynamicDrawer />}
        {fields.map((field, index) => {
          return (
            <div
              key={field.id}
              className="border border-grey-600 rounded p-4 relative space-y-2"
            >
              <Button
                className="p-0 absolute -top-1 right-0 hover:bg-transparent"
                variant="ghost"
                onClick={(ev) => remove(index)}
              >
                <X className="w-8 text-red-400" />
              </Button>
              <div className="flex space-x-2 items-end">
                <div className="flex-grow overflow-hidden">
                  {!watch(`${typedName}.${index}.useNameOveride` as const) && (
                    <>
                      <Combobox
                        labelTitle="Material Component"
                        key={field.id}
                        data={comboBoxProps}
                        register={() =>
                          register(`${typedName}.${index}.id` as const, {
                            required: true,
                          })
                        }
                      />
                      <ErrorMessage
                        errors={formState.errors}
                        name={`${typedName}.${index}.id`}
                        message="This field is required"
                        render={({ message }) => InputError({ message })}
                      />
                    </>
                  )}
                  {watch(`${typedName}.${index}.useNameOveride` as const) && (
                    <>
                      <Input
                        labelTitle="Material Component - Name Overide"
                        register={() =>
                          register(`${typedName}.${index}.name` as const, {
                            required: true,
                          })
                        }
                      />
                      <ErrorMessage
                        errors={formState.errors}
                        name={`${typedName}.${index}.name`}
                        message="This field is required"
                        render={({ message }) => InputError({ message })}
                      />
                    </>
                  )}
                </div>
                {watch(`${typedName}.${index}.id` as const) && (
                  <Controller
                    name={`${typedName}.${index}.useNameOveride` as const}
                    render={({ field }) => (
                      <Toggle
                        {...field}
                        onPressedChange={(v) => {
                          const id = getValues(
                            `${typedName}.${index}.id` as const
                          );
                          setValue(`${typedName}.${index}.name`, id);
                          setValue(`${typedName}.${index}.useNameOveride`, v);
                        }}
                        variant="outline"
                      >
                        <Pencil className="w-4" />
                      </Toggle>
                    )}
                  />
                )}
                <Controller
                  name={`${typedName}.${index}.ragStatus`}
                  render={({ field }) => {
                    return (
                      <div {...field}>
                        <Select>
                          <SelectTrigger
                            className={`text-white rounded w-10 h-10 ${mapValueToColor(
                              field.value
                            )}`}
                          >
                            <SelectValue placeholder="RAG" hidden />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="N/I"><div className="flex justify-between items-center w-full"><div>N.I</div><div className="w-4 h-4 rounded-lg bg-slate-400"></div></div></SelectItem>
                            <SelectItem value="Red">Red</SelectItem>
                            <SelectItem value="Amber">Amber</SelectItem>
                            <SelectItem value="Green">Green</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }}
                />
              </div>
              {watch("level") === "3" && (
                <div>
                  <Input
                    labelTitle="Budget Cost"
                    type="number"
                    placeholder="£1000"
                    register={() =>
                      register(`${typedName}.${index}.budgetCost` as const)
                    }
                  />
                  <ErrorMessage
                    errors={formState.errors}
                    name={`${typedName}.${index}.budgetCost`}
                    message="This field is required"
                    render={({ message }) => InputError({ message })}
                  />
                </div>
              )}
              {watch(`${typedName}.${index}.id` as const) && (
                <div className="p-4">
                  {getDefectsFor(
                    watch(`${typedName}.${index}.id` as const)
                  ).map((defect, defectIndex) => (
                    <DefectCheckbox
                      key={defectIndex.toString()}
                      defect={defect}
                      name={`${typedName}.${index}.defects.${defectIndex}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button
        className="w-full"
        variant="secondary"
        onClick={addMaterialComponent}
      >
        Add Material Component
      </Button>
      <ErrorMessage
        name={name}
        errors={formState.errors}
        message="You must add at least one Material Component"
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
};