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
import { Pencil, TextCursor, X } from "lucide-react";
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
import { DynamicDrawer, useDynamicDrawer } from "@/app/components/Drawer";
import { DefectCheckbox } from "./DefectPicker";
import { Label } from "@/app/components/Input/Label";

import { DataForm as BuildingComponentsForm } from "@/app/building-components/form";

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

  function getComponentIdFor(materialComponentName: string): string | undefined {
    const [componentName, materialName] = materialComponentName.split("_");
    return components.find((c) => c.name === componentName)?.id;
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


  const { openDrawer } = useDynamicDrawer();

  function handleEdit(componentName: string) {

    const componentId = getComponentIdFor(componentName);

    console.log("[ComponentPicker] handleEdit", componentName, componentId);
    if (!componentId) {
      return;
    }

    openDrawer({
      title: "Edit Component",
      description: "Edit the component",
      content: <BuildingComponentsForm id={componentId} />,
    });
  }

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
        {fields.map((field, index) => {

          const useNameOveride = watch(`${typedName}.${index}.useNameOveride` as const);
          const id = watch(`${typedName}.${index}.id` as const);

          return (
            <div
              key={field.id}
              className="border border-grey-600 rounded p-4 relative space-y-2"
            >
              <div className="flex items-center justify-end space-x-2 h-2">
                {id && (<Pencil className="hover:cursor-pointer"  size={15} onClick={ev => handleEdit(id)}/>)}
                <X className="text-red-400 hover:cursor-pointer" size={20} onClick={ev => remove(id)} />
              </div>
              <div className="flex space-x-2 items-end">
                <div className="flex-grow overflow-hidden">
                  {!useNameOveride && (
                    <>
                      <Combobox
                        labelTitle="Material Component"
                        key={field.id}
                        data={comboBoxProps}
                        addNewComponent={<BuildingComponentsForm />}
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
                  {useNameOveride && (
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
                {id && (
                  <Controller
                    name={`${typedName}.${index}.useNameOveride` as const}
                    render={({ field }) => (
                      <Toggle
                        {...field}
                        onPressedChange={(v) => {
                          setValue(`${typedName}.${index}.name`, id);
                          setValue(`${typedName}.${index}.useNameOveride`, v);
                        }}
                        variant="outline"
                      >
                        <TextCursor className="w-4" />
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
                            <SelectItem value="N/I">N/I</SelectItem>
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
              {id && (
                <div className="p-4">
                  <Label key={`${typedName}.${index}.id`} text={"Defects"} />
                  {getDefectsFor(id).map((defect, defectIndex) => (
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