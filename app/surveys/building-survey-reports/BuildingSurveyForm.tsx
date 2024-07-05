import React, { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  ElementSection,
  Defect,
  RagStatus,
  BuildingSurveyFormData as BuildingSurveyForm
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
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { SelectTrigger } from "@radix-ui/react-select";



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
  id?: string;
}

const selectionSetElement = ["id", "name", "components.*", "priority"] as const;
type ElementData = SelectionSet<Schema["Elements"]["type"], typeof selectionSetElement>;

export default function Report({ id }: BuildingSurveyFormProps) {
  let defaultValues: BuildingSurveyForm = {
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

  const methods = useForm<BuildingSurveyForm>({ defaultValues });
  const { register, handleSubmit, watch, formState, reset  } = methods;
  const router = useRouter();

  const createDefaultElementSection = (element : ElementData): ElementSection => ({
    name: element.name,
    isPartOfSurvey: false,
    description: "",
    images: [],
    materialComponents: []
  });

  if(id) {
    useEffect(() => {
        const fetchReport = async () => {
          const report = await reportClient.models.Surveys.get({ id });
  
          if(report.data) {
            const formData = JSON.parse(report.data.content as string) as BuildingSurveyForm;
            reset(formData);
            console.log("reset from fetchReport", formData)
          }
          else {
            console.error("Failed to fetch report", report.errors);
          }
        }
  
        fetchReport();
    }, [])
  }
  else {
    useEffect(() => {
      const fetchElements = async () => {
        try {
          const response = await reportClient.models.Elements.list(
            { selectionSet: selectionSetElement }
          );
  
          const currentForm = watch();
  
          if (response.data) {
            currentForm.sections[0].elementSections = response.data
              .sort((x, y) => {
                let a = x.priority ? x.priority : 0;
                let b = y.priority ? y.priority : 0;
                return a - b;
              })
              .map((element) => createDefaultElementSection(element));
          }
  
          reset(currentForm);
        } catch (error) {
          console.error("Failed to fetch elements", error);
        }
      };
  
      fetchElements();
    }, [])
  }


  const onSubmit = async () => {
    try {
      let form = watch();
      let _ = await reportClient.models.Surveys.create({
        id: form.id,
        content: JSON.stringify(form),
      });
      
      successToast("Saved");
      router.push("/surveys");
    } catch (error) {
      console.error(error);
    }
  };

  const fields = watch();

  return (
    <div className="md:grid md:grid-cols-4 mb-4">
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
                  <div>
                    <InputImage
                      register={() => register("frontElevationImagesUri")}
                      path={`report-images/${fields.id}/frontElevationImages/`}
                    />
                  </div>
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
                            <div>
                              <InputImage
                                register={() =>
                                  register(
                                    `sections.${sectionIndex}.elementSections.${i}.images`
                                  )
                                }
                                path={`report-images/${defaultValues.id}/elementSections/${i}/images`}
                              />
                            </div>
                            <ComponentPicker name={`sections.${sectionIndex}.elementSections.${i}.materialComponents`} />
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
  const { control, register, watch, setValue, getValues } = useFormContext();
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
              <div className="flex gap-2">
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
                <Controller name={`${typedName}.${index}.ragStatus`} render={({ field }) => {
                  const mapValueToColor = (value: RagStatus) => {
                    switch(value) {
                      case "N/I":
                        return "bg-gray-400";
                      case "Red":
                        return "bg-red-400";
                      case "Amber":
                        return "bg-yellow-400";
                      case "Green":
                        return "bg-green-400";
                    }
                  }

                  return (
                    <div {...field}>
                      <Select>
                        <SelectTrigger className={`${mapValueToColor(field.value)} text-white rounded w-10 h-10`} >
                          <SelectValue  placeholder="RAG" hidden />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="N/I">N.I</SelectItem>
                          <SelectItem value="Red">Red</SelectItem>
                          <SelectItem value="Amber">Amber</SelectItem>
                          <SelectItem value="Green">Green</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }}/>
                <Button className="p-2" variant="ghost" onClick={(ev) => remove(index)}>
                  <X className="w-8 text-red-400" />
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
                        `${typedName}.${index}.defects.${defectIndex}`
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
  const { register, control, watch } = useFormContext();

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
              <input type="hidden" {...register(`${typedName}.name` as const)} value={defect.name} />
              <TextAreaInput
                labelTitle={defect.name}
                defaultValue={defect.description}
                placeholder={"Defect text..."}
                register={() =>
                  register(`${typedName}.description` as const, { required: true })
                }
              />
            </div>
          )}
        </div>
      )}
    ></Controller>
  );
}
