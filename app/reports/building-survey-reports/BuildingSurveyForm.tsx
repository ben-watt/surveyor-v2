import React, { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  BuildingSurveyFormData,
  MaterialComponent,
  ElementSection,
  Defect,
  RagStatus
} from "./BuildingSurveyReportSchema";

import { useForm, FormProvider, Controller, useFormContext, useFieldArray } from "react-hook-form";
import { ToggleSection } from "./Defects";
import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "../../components/Input/InputText";
import InputImage from "../../components/Input/ImageInput";
import SmartTextArea from "../../components/Input/SmartTextArea";
import InputError from "@/app/components/InputError";
import reportClient from "@/app/clients/ReportsClient";
import { successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, X } from "lucide-react";
import { Label } from "@aws-amplify/ui-react";
import { Combobox } from "@/app/components/Input/ComboBox";
import { Button } from "@/components/ui/button";
import { Schema } from "@/amplify/data/resource";
import { SelectionSet } from "aws-amplify/api";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { Toggle } from "@/components/ui/toggle";



      // {
      //   name: "External Condition of Property",
      //   elementSections: [
      //     "Foundations and Substructure",
      //     "Roof Coverings",
      //     "Chimneys",
      //     "Rainwater Disposal System",
      //     "Sofits and Fascias",
      //     "Main Walls",
      //     "Windows and Doors",
      //   ].map(createDefaultElementSection),
      // },
      // {
      //   name: "Internal Condition of Property",
      //   elementSections: [
      //     "Roof Structure",
      //     "Ceilings",
      //     "Walls and Partitions",
      //     "Floors",
      //     "Internal Joinery",
      //     "Sanitaryware & Kitchen",
      //     "Fireplaces",
      //   ].map(createDefaultElementSection),
      // },
      // {
      //   name: "Services",
      //   elementSections: [
      //     "Electrical Installation",
      //     "Gas Installations",
      //     "Cold Water Supply",
      //     "Hot Water Supply / Heating Installations",
      //     "Surface water & Soil drainage",
      //   ].map(createDefaultElementSection),
      // },
      // {
      //   name: "Grounds",
      //   elementSections: ["Boundaries, Fencing, Drives, Lawn, etc"].map(
      //     createDefaultElementSection
      //   ),
      // },

interface BuildingSurveyFormProps {
  initDefaultValues?: BuildingSurveyFormData;
}

const selectionSetElement = ["id", "name", "components.*"] as const;
type ElementData = SelectionSet<Schema["Elements"]["type"], typeof selectionSetElement>;

export default function Report({ initDefaultValues }: BuildingSurveyFormProps) {
  let defaultValues: BuildingSurveyFormData = {
    id: uuidv4(),
    reportDate: new Date(),
    address: "",
    clientName: "",
    frontElevationImagesUri: [],
    sections: [{
      name: "External Condition of Property",
      elementSections: []
    }],
  };

  const methods = useForm<BuildingSurveyFormData>({ defaultValues });
  const { register, handleSubmit, watch, formState, reset  } = methods;
  const router = useRouter();

  const createDefaultElementSection = (element : ElementData): ElementSection => ({
    name: element.name,
    isPartOfSurvey: false,
    description: "",
    images: [],
    materialComponents: []
  });

  if (initDefaultValues) {
    defaultValues = initDefaultValues;
  }

  useEffect(() => {
    const fetchElements = async () => {
      try {
        const response = await reportClient.models.Elements.list(
          { selectionSet: selectionSetElement }
        );

        console.log(response.data);
        
        if (response.data) {
          defaultValues.sections[0].elementSections = response.data.map((element) => createDefaultElementSection(element));
        }

        console.log("resetting default values", defaultValues)
        reset(defaultValues);

      } catch (error) {
        console.error("Failed to fetch elements", error);
      }
    };

    fetchElements();
  }, [])

  const onSubmit = async () => {
    try {
      let form = watch();
      let _ = await reportClient.models.Reports.create({
        id: form.id,
        content: JSON.stringify(form),
      });
      
      successToast("Saved");
      router.push("/reports");
    } catch (error) {
      console.error(error);
    }
  };

  const fields = watch();

  return (
    <div className="md:grid md:grid-cols-4 ">
      <div className="col-start-2 col-span-2">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
              <div className="space-y-4">
                <div>
                  <InputText
                    labelTitle="Address"
                    register={() =>
                      register("address", { required: "Address is required" })
                    }
                  />
                  <InputError message={formState.errors.address?.message} />
                </div>
                <div>
                  <InputText
                    labelTitle="Client"
                    register={() => register("clientName", { required: true })}
                  />
                  <InputError message={formState.errors.clientName?.message} />
                </div>
                <div>
                  <label className="mt-2" htmlFor="file-input">
                    Front Elevation Image
                  </label>
                  <InputImage
                    register={() => register("frontElevationImagesUri")}
                    path={`report-images/${fields.id}/frontElevationImages/`}
                  />
                </div>
              </div>
              {fields.sections.map((section, sectionIndex) => {
                return (
                  <div className="border border-grey-600 p-2 mt-2 mb-2 rounded" key={`${section}-${sectionIndex}`}>
                    <div>{section.name}</div>
                    {section.elementSections.map((elementSection, i) => (
                      <section key={`${sectionIndex}.${i}`} className="border border-grey-600 p-2 m-2 rounded ">
                        <ToggleSection
                          defaultValue={elementSection.isPartOfSurvey}
                          label={elementSection.name}
                          register={() =>
                            register(
                              `sections.${sectionIndex}.elementSections.${i}.isPartOfSurvey`
                            )
                          }
                        >
                          <div className="flex-row space-y-2 p-2">
                            <SmartTextArea
                              label={elementSection.name}
                              placeholder={`Description of the ${elementSection.name.toLowerCase()}...`}
                              register={() =>
                                register(
                                  `sections.${sectionIndex}.elementSections.${i}.description`
                                )
                              }
                            />
                            <InputImage
                              register={() =>
                                register(
                                  `sections.${sectionIndex}.elementSections.${i}.images`
                                )
                              }
                              path={`report-images/${defaultValues.id}/elementSections/${i}/images`}
                            />
                            <ComponentPicker name={`sections.${sectionIndex}.elementSections.${i}.components`} />
                          </div>
                        </ToggleSection>
                      </section>
                    ))}
                  </div>
                );
              })}
            </div>
            <div>
              <PrimaryBtn className="w-full flex justify-center" type="submit">
                Save
              </PrimaryBtn>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}


interface ComponentPickerProps {
  name: string;
}

const componentDataSelectList = ["id", "name", "materials.*"] as const;
type ComponentData = SelectionSet<Schema["Components"]["type"], typeof componentDataSelectList>;

const ComponentPicker = ({ name }: ComponentPickerProps) => {
  const typedName = name as `sections.0.elementSections.0.materialComponents`
  const { control, register, watch, setValue, getValues } = useFormContext<BuildingSurveyFormData>();
  const { fields, remove, append } = useFieldArray({ name : typedName, control: control });
  const [components, setComponents] = React.useState<ComponentData[]>([]);

  useEffect(() => {
    async function fetchData(){
      const availableComponents = await reportClient.models.Components.list({
        selectionSet: componentDataSelectList
      })

      if(availableComponents.data) {
        setComponents(availableComponents.data)
      }
    }

    fetchData()
  }, [])

  if(components.length === 0) {
    return null;
  }

  function addMaterialComponent(ev : React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    ev.preventDefault();
    append({ id: "", name: "", ragStatus: "N/I", defects: [], useNameOveride: false  }, { shouldFocus: true });
  }

  function getDefectsFor(materialComponentName: string) : Defect[] {
    const [componentName, materialName] = materialComponentName.split("_");
    const component = components.find(c => c.name === componentName);

    if(!component) {
      return [];
    }

    const material = component.materials.find(m => m.name === materialName);

    if(!material) {
      return [];
    }

    return material.defects;
  }

  const  mapToComboBoxProps = (components: ComponentData[]) : { label: string, value: string }[]  => components
    .flatMap(c => c.materials.map(m => ({ label: `${c.name} • ${m.name}`, value: `${c.name}_${m.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label)));

  return (
    <div className="grid gap-2">
      <div className="grid gap-2">
        {fields.map((field, index) => {

          return (
            <div key={field.id} className="border border-grey-600 rounded p-4">
              <div className="flex gap-4">
                <div className="flex-grow">
                  {!watch(`${typedName}.${index}.useNameOveride` as const) && (
                    <Combobox
                      key={field.id}
                      data={mapToComboBoxProps(components)}
                      register={() =>
                        register(`${typedName}.${index}.id` as const, {
                          required: true,
                        })
                      }
                    />
                  )}
                  {watch(`${typedName}.${index}.useNameOveride` as const) && (
                    <InputText
                      labelTitle="Name"
                      register={() =>
                        register(`${typedName}.${index}.name` as const, {
                          required: true
                        })
                      }
                    />
                  )}
                </div>
                {watch(`${typedName}.${index}.id` as const) && (
                  <Controller
                    name={`${typedName}.${index}.useNameOveride` as const}
                    render={({ field }) => (
                      <Toggle
                        {...field}  
                        onPressedChange={(v) => {
                          const id = getValues(`${typedName}.${index}.id` as const)
                          setValue(`${typedName}.${index}.name`, id)
                          setValue(`${typedName}.${index}.useNameOveride`, v)
                        }}    
                        variant="outline"
                      >
                        <Pencil className="w-4" />
                      </Toggle>
                    )}
                  />
                )}
                <Button variant="destructive" onClick={(ev) => remove(index)}>
                  Remove
                </Button>
              </div>
              {watch(`${typedName}.${index}.id` as const) && (
                <div className="p-4">
                  {getDefectsFor(
                    watch(`${typedName}.${index}.id` as const)
                  ).map((defect, defectIndex) => (
                    <DefectCheckbox
                      key={defectIndex.toString()}
                      defect={defect}
                      {...register(
                        `${typedName}.${index}.defects.${defectIndex}.isChecked`
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button variant="secondary" onClick={addMaterialComponent}>
        Add Material Component
      </Button>
    </div>
  );
};

interface DefectCheckboxProps {
  key: string;
  defect: Defect;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  name: string;
  ref: React.Ref<HTMLInputElement>;
}

const DefectCheckbox = ({ defect, name } : DefectCheckboxProps) => {
  const typedName = name as `sections.0.elementSections.0.materialComponents.0.defects.0`
  const { register, control, watch } = useFormContext<BuildingSurveyFormData>();

  const isChecked = watch(`${typedName}.isChecked`);

  return (
    <Controller
      name={`${typedName}.isChecked` as const}
      control={control}
      render={({ field }) => (
        <div>
          <div className="flex items-center gap-3">
            <Checkbox
              id={field.name}
              name={field.name}
              onCheckedChange={field.onChange}
              ref={field.ref}
              checked={field.value}
              onBlur={field.onBlur}
            />
            <Label htmlFor={field.name} className="text-sm cursor-pointer">
              {defect.name}
            </Label>
          </div>
          {isChecked && (
            <div className="ml-5 p-2">
              <TextAreaInput
                labelTitle={defect.name}
                defaultValue={defect.description}
                placeholder={"Defect text..."}
                register={() =>
                  register(`${typedName}.description`, { required: true })
                }
              />
            </div>
          )}
        </div>
      )}
    ></Controller>
  );
}
