import React, { useEffect, useState } from "react";

import {
  BuildingSurveyFormData,
  Defect,
  MaterialComponent,
  RagStatus,
} from "./BuildingSurveyReportSchema";

import {
  Controller,
  useFormContext,
  useFieldArray,
  useWatch,
  useForm,
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
import { useDynamicDrawer } from "@/app/components/Drawer";
import { DefectCheckbox } from "./DefectPicker";
import { Label } from "@/app/components/Input/Label";

import { DataForm as BuildingComponentsForm } from "@/app/building-components/form";
import { v4 } from "uuid";

interface ComponentPickerProps {
  name: string;
  elementId: string;
  defaultValues: MaterialComponent[];
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

export const ComponentPicker = ({ name, elementId, defaultValues }: ComponentPickerProps) => {
  const typedName = name as `sections.0.elementSections.0.materialComponents`;

  console.log("[ComponentPicker] defaultValues", defaultValues);

  const { control, register, watch, setValue, formState, resetField } = useFormContext();
  const { fields, remove, append } = useFieldArray({
    name: typedName,
    control: control,
    keyName: "fieldId",
    shouldUnregister: true,
    rules: {
      required: true,
      validate: (v) => v.length > 0,
    },
  });

  const w = useWatch({ control, name: typedName, defaultValue: fields });
  const controlledFields = fields.map((f, i) => ({ ...f, ...w[i] }));
  const [availableComponents, setAvailableComponents] = useState<ComponentDataWithChild[]>([]);

  useEffect(() => {
    async function fetchData() {
      const availableComponents = await reportClient.models.Components.list({
        selectionSet: componentDataSelectList,
      });

      if (availableComponents.data) {
        setAvailableComponents(availableComponents.data as ComponentDataWithChild[]);

        // If we don't reset here we loose the values we had initially
        resetField(typedName, { defaultValue: defaultValues});
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
    if(!materialComponentName || typeof materialComponentName !== "string") {
      return [];
    }

    const [componentName, materialName] = materialComponentName.split("_");
    const component = availableComponents.find((c) => c.name === componentName);

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
    return availableComponents.find((c) => c.name === componentName)?.id;
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


  const { openDrawer, closeDrawer } = useDynamicDrawer();

  function handleEdit(componentName: string) {

    const componentId = getComponentIdFor(componentName);

    if (!componentId) {
      return;
    }

    openDrawer({
      title: "Edit Component",
      description: "Edit the component",
      content: <BuildingComponentsForm id={componentId} onSave={() => closeDrawer()} />,
    });
  }

  function handleCreateNew(newComponentElementId: string) {
    openDrawer({
      title: "Create new component",
      description: "Create a new component",
      content: (
        <BuildingComponentsForm
          onSave={() => closeDrawer()}
          defaultValues={{
            id: v4(),
            elementId: newComponentElementId,
            name: "",
            materials: [],
          }}
        />
      ),
    });
  }

  // This causes an issue whereby we no longer get access to the default values against the form
  // I think we'd need to load then reset this section of the form to get them back 
  // for now I've just commented it out.
  //
  if (availableComponents.length === 0) {
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
        {controlledFields.map((field, index) => {

          const useNameOveride = field.useNameOveride;
          const id = field.id;
          const otherSelectedMaterialIds = w.filter((f :any) => f.id !== id).map((f :any) => f.id);

          const props = availableComponents
            .filter((c) => c.elementId === elementId)
            .flatMap((c) =>
              c.materials
                .map((m) => ({
                  label: `${c.name} • ${m!.name}`,
                  value: `${c.name}_${m!.name}`,
                }))
                .filter(m => otherSelectedMaterialIds.includes(m.value) === false)
            ).sort((a, b) => a.label.localeCompare(b.label));

          return (
            <div
              key={field.fieldId}
              className="border border-grey-600 rounded p-4 relative space-y-2"
            >
              <div className="flex items-center justify-end space-x-2 h-2">
                {id && (
                  <Pencil
                    className="hover:cursor-pointer p-1"
                    onClick={(ev) => handleEdit(id)}
                  />
                )}
                <X
                  className="text-red-400 hover:cursor-pointer"
                  onClick={(ev) => remove(index )}
                />
              </div>
              <div className="flex space-x-2 items-end">
                <div className="flex-grow overflow-hidden">
                  {!useNameOveride && (
                    <>
                      <Combobox
                        labelTitle="Material Component"
                        data={props}
                        onCreateNew={() => handleCreateNew(elementId)}
                        controllerProps={{
                          name: `${typedName}.${index}.id` as const,
                          control: control,
                          rules: {
                            required: true
                          }
                        }}
                      />
                    </>
                  )}
                  {useNameOveride && (
                    <>
                      <Input
                        labelTitle="Material Component - Name Overide"
                        errors={formState.errors}
                        register={() =>
                          register(`${typedName}.${index}.name` as const, {
                            required: true,
                          })
                        }
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
                      <div {...field} className="w-10 h-10">
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
                    errors={formState.errors}
                    register={() =>
                      register(`${typedName}.${index}.budgetCost` as const)
                    }
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