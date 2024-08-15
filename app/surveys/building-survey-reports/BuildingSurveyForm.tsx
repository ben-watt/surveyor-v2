import React, { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  ElementSection,
  Defect,
  RagStatus,
  Input as InputT,
  BuildingSurveyFormData as BuildingSurveyForm,
  InputType,
} from "./BuildingSurveyReportSchema";

import {
  useForm,
  FormProvider,
  Controller,
  useFormContext,
  useFieldArray,
  UseFormRegister,
  FieldValues,
  Path,
} from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import { InputToggle } from "../../components/Input/InputToggle";
import { PrimaryBtn } from "@/app/components/Buttons";
import Input from "../../components/Input/InputText";
import InputImage from "../../components/Input/ImageInput";
import InputDate from "../../components/Input/InputDate";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@radix-ui/react-select";
import toast from "react-hot-toast";
import { InputCheckbox } from "@/app/components/Input/InputCheckbox";
import { FormSection } from "@/app/components/FormSection";

function mapToInputType<T, K extends FieldValues>(
  input: InputT<T>,
  registerName: Path<K>,
  register: UseFormRegister<K>
) {
  switch (input.type) {
    case "text":
      return (
        <Input
          labelTitle={input.label}
          placeholder={input.placeholder}
          register={() => register(registerName, { required: input.required })}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          labelTitle={input.label}
          placeholder={input.placeholder}
          register={() => register(registerName, { required: input.required })}
        />
      );
    case "textarea":
      return (
        <TextAreaInput
          labelTitle={input.label}
          placeholder={input.placeholder}
          register={() => register(registerName, { required: input.required })}
        />
      );
    case "checkbox":
      return (
        <InputCheckbox
          labelText={input.label}
          rhfName={registerName}
          controllerProps={{ rules: { required: input.required, validate: input.validate } }}
        />
      );
    case "select":
      return (
        <>
          <label htmlFor={input.label} className="text-sm">
            {input.label}
          </label>
          <Combobox
            data={[
              { label: "Freehold", value: "Freehold" },
              { label: "Leasehold", value: "Leasehold" },
              { label: "Commonhold", value: "Commonhold" },
              { label: "Other", value: "Other" },
              { label: "Unknown", value: "Unknown" },
            ]}
            register={() =>
              register(registerName, { required: input.required })
            }
          />
        </>
      );
    default:
      return (
        <Input
          labelTitle={input.label}
          register={() => register(registerName, { required: input.required, validate: input.validate })}
        />
      );
  }
}

interface BuildingSurveyFormProps {
  id?: string;
}

const selectionSetElement = [
  "id",
  "name",
  "components.*",
  "order",
  "section",
] as const;
type ElementData = SelectionSet<
  Schema["Elements"]["type"],
  typeof selectionSetElement
>;

const shouldBeTrueCheckBox = (label: string) : InputT<boolean> => ({
    type: "checkbox",
    placeholder: "",
    value: false,
    label: label,
    required: true,
    validate: (value: boolean) => value === true,
  })

export default function Report({ id }: BuildingSurveyFormProps) {
  let defaultValues: BuildingSurveyForm = {
    id: uuidv4(),
    reportDate: new Date(),
    address: "",
    clientName: "",
    inspectionDate: new Date(),
    weather: "",
    orientation: "",
    situation: "",
    propertyDescription: {
      propertyType: {
        type: "text",
        value: "",
        label: "Property Type",
        placeholder:
          "Detached, Semi-detached, Terraced, Flat, Bungalow, Maisonette, Other",
        required: true,
      },
      yearOfConstruction: {
        type: "number",
        value: 0,
        label: "Year of Construction",
        placeholder: "Year of Construction",
        required: true,
      },
      yearOfRefurbishment: {
        type: "number",
        value: 0,
        label: "Year of Refurbishment",
        placeholder: "Year of Refurbishment",
        required: false,
      },
      constructionDetails: {
        type: "textarea",
        value: "",
        label: "Construction Details",
        placeholder: "Brick, Stone, Timber, Concrete, Steel, Glass, Other",
        required: true,
      },
      grounds: {
        type: "textarea",
        value: "",
        label: "Grounds",
        placeholder: "Garden, Yard, Paved, Lawn, Other",
        required: true,
      },
      services: {
        type: "text",
        value: "",
        label: "Services",
        placeholder:
          "Electricity, Gas, Water, Drainage, Telephone, Broadband, Other",
        required: true,
      },
      otherServices: {
        type: "text",
        value: "",
        label: "Other Services",
        placeholder: "Cable TV, Satellite TV, Solar Panels, Other",
        required: false,
      },
      energyRating: {
        type: "text",
        value: "",
        label: "Energy Rating",
        placeholder: "A, B, C, D, E, F, G, Other",
        required: true,
      },
      numberOfBedrooms: {
        type: "number",
        value: 0,
        label: "Number of Bedrooms",
        placeholder: "Number of Bedrooms",
        required: true,
      },
      numberOfBathrooms: {
        type: "number",
        value: 0,
        label: "Number of Bathrooms",
        placeholder: "Number of Bathrooms",
        required: true,
      },
      tenure: {
        type: "select",
        value: "Unknown",
        label: "Tenure",
        placeholder: "Freehold, Leasehold, Commonhold, Other",
        required: true,
      },
    },
    frontElevationImagesUri: [],
    sections: [
      {
        name: "External Condition of Property",
        elementSections: [],
      },
      {
        name: "Internal Condition of Property",
        elementSections: [],
      },
      {
        name: "Services",
        elementSections: [],
      },
      {
        name: "Grounds (External Areas)",
        elementSections: [],
      },
    ],
    checklist: [
      shouldBeTrueCheckBox("Have you checked for asbestos?"),
      shouldBeTrueCheckBox("Have you lifted manhole covers to drains?"),
      shouldBeTrueCheckBox("Have you checked for Japanese Knotweed?"),
      shouldBeTrueCheckBox("Have you checked external ground levels in relation to DPCs / Air Vents?"),
      shouldBeTrueCheckBox("Have you located services, elecs, gas, water, etc...?"),
      shouldBeTrueCheckBox("Have you checked if chimney breasts been removed internally?"),
      shouldBeTrueCheckBox("Have you checked the locations and severity of all cracks been logged?"),
      shouldBeTrueCheckBox("Have you checked if there are any mature trees in close proximity to the building?"),
      shouldBeTrueCheckBox("I confirm that the information provided is accurate"),
    ],
  };

  const methods = useForm<BuildingSurveyForm>({ defaultValues });
  const { register, handleSubmit, watch, formState, reset, control } = methods;
  const router = useRouter();

  const sections = watch("sections") as BuildingSurveyForm["sections"];

  const createDefaultElementSection = (
    element: ElementData
  ): ElementSection => ({
    name: element.name,
    isPartOfSurvey: false,
    description: "",
    images: [],
    materialComponents: [],
  });

  useEffect(() => {
    const fetchReport = async (existingReportId: string) => {
      const report = await reportClient.models.Surveys.get({
        id: existingReportId,
      });

      if (report.data) {
        const formData = JSON.parse(
          report.data.content as string
        ) as BuildingSurveyForm;
        reset(formData);
        console.log("reset from fetchReport", formData);
      } else {
        console.error("Failed to fetch report", report.errors);
      }
    };

    const fetchElements = async () => {
      try {
        const response = await reportClient.models.Elements.list({
          selectionSet: selectionSetElement,
        });

        const currentForm = watch();

        if (response.data) {
          response.data
            .sort((x, y) => {
              let a = x.order ? x.order : 0;
              let b = y.order ? y.order : 0;
              return a - b;
            })
            .map((element) => {
              currentForm.sections.forEach((section) => {
                if (section.name === element.section) {
                  section.elementSections.push(
                    createDefaultElementSection(element)
                  );
                }
              });
            });
        }

        reset(currentForm);
      } catch (error) {
        console.error("Failed to fetch elements", error);
      }
    };

    if (id) {
      fetchReport(id);
    } else {
      fetchElements();
    }
  }, [id, reset, watch]);

  const onSubmit = async () => {
    try {
      let form = watch();

      if (!id) {
        let _ = await reportClient.models.Surveys.create({
          id: form.id,
          content: JSON.stringify(form),
        });

        successToast("Created Survey");
      } else {
        let _ = await reportClient.models.Surveys.update({
          id: form.id,
          content: JSON.stringify(form),
        });

        successToast("Updated Survey");
      }

      router.push("/surveys");
    } catch (error) {
      toast.error("Failed to save report");
      console.error(error);
    }
  };

  return (
    <div className="md:grid md:grid-cols-4 mb-4">
      <div className="col-start-2 col-span-2">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
              <div className="space-y-4">
                <div>
                  <Input
                    labelTitle="Address"
                    placeholder="123 Main St, London, UK"
                    register={() => register("address", { required: true })}
                  />
                   <ErrorMessage
                      errors={formState.errors}
                      name={"address"}
                      message="This field is required"
                      render={({ message }) => InputError({ message })}
                    />
                </div>
                <div>
                  <Input
                    labelTitle="Client"
                    placeholder="Mr John Doe"
                    register={() => register("clientName", { required: true })}
                  />
                  <ErrorMessage
                      errors={formState.errors}
                      name={"clientName"}
                      message="This field is required"
                      render={({ message }) => InputError({ message })}
                    />
                </div>
                <div>
                  <Controller
                    name="inspectionDate"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <InputDate labelTitle="Inspection Date" {...field} />
                    )}
                  />
                  <ErrorMessage
                    errors={formState.errors}
                    name={"inspectionDate"}
                    message="This field is required"
                    render={({ message }) => InputError({ message })}
                  />
                </div>
                <div>
                  <Input
                    labelTitle="Weather"
                    placeholder="Sunny, clear, 20°C"
                    register={() => register("weather", { required: true })}
                  />
                  <ErrorMessage
                    errors={formState.errors}
                    name={"weather"}
                    message="This field is required"
                    render={({ message }) => InputError({ message })}
                  />
                </div>
                <div>
                  <TextAreaInput
                    labelTitle="Orientation"
                    register={() => register("orientation", { required: true })}
                  />
                  <ErrorMessage
                    errors={formState.errors}
                    name={"orientation"}
                    message="This field is required"
                    render={({ message }) => InputError({ message })}
                  />
                </div>
                <div>
                  <TextAreaInput
                    labelTitle="Situation"
                    register={() => register("situation", { required: true })}
                  />
                  <ErrorMessage
                    errors={formState.errors}
                    name={"situation"}
                    message="This field is required"
                    render={({ message }) => InputError({ message })}
                  />
                </div>
                <div>
                  <InputImage
                    labelTitle="Elevation Images"
                    register={() => register("frontElevationImagesUri")}
                    path={`report-images/${defaultValues.id}/frontElevationImages/`}
                  />
                </div>
              </div>
              <FormSection title="Property Description">
                {Object.keys(defaultValues.propertyDescription)?.map((key) => {
                  const propKey  = key as keyof typeof defaultValues.propertyDescription;
                  const property = defaultValues.propertyDescription[propKey] as InputT<InputType>;
                  const reqName = `propertyDescription.${propKey}.value` as const;

                  return (
                    <div key={key} className="mt-1 mb-1">
                      {mapToInputType(property, reqName, register)}
                      <ErrorMessage
                        errors={formState.errors}
                        name={reqName}
                        message="This field is required"
                        render={({ message }) => InputError({ message })}
                      />
                    </div>
                  );
                })}
              </FormSection>
              {sections.map((section, sectionIndex) => {
                return (
                  <FormSection title={section.name}
                    key={`${section}-${sectionIndex}`}
                  >
                    {section.elementSections.map((elementSection, i) => (
                      <section
                        key={`${sectionIndex}.${i}`}
                        className="border border-grey-600 p-2 m-2 rounded "
                      >
                        <InputToggle
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
                            <ComponentPicker
                              name={`sections.${sectionIndex}.elementSections.${i}.materialComponents`}
                            />
                          </div>
                        </InputToggle>
                      </section>
                    ))}
                  </FormSection>
                );
              })}
            </div>
            <FormSection title="Checklist">
              {defaultValues.checklist.map((checklist, index) => {
                return (
                  <div className="mt-4 mb-4" key={index}>
                    <div>
                      {mapToInputType(
                        checklist,
                        `checklist.${index}.value`,
                        register
                      )}
                    </div>
                    <ErrorMessage
                      errors={formState.errors}
                      name={`checklist.${index}.value`}
                      message="This field is required and must be checked"
                      render={({ message }) => InputError({ message })}
                    />
                  </div>
                );
              })}
            </FormSection>
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
type ComponentData = SelectionSet<
  Schema["Components"]["type"],
  typeof componentDataSelectList
>;

const ComponentPicker = ({ name }: ComponentPickerProps) => {
  const typedName = name as `sections.0.elementSections.0.materialComponents`;
  const { control, register, watch, setValue, getValues } = useFormContext();
  const { fields, remove, append } = useFieldArray({
    name: typedName,
    control: control,
  });
  const [components, setComponents] = React.useState<ComponentData[]>([]);

  useEffect(() => {
    async function fetchData() {
      const availableComponents = await reportClient.models.Components.list({
        selectionSet: componentDataSelectList,
      });

      if (availableComponents.data) {
        setComponents(availableComponents.data);
      }
    }

    fetchData();
  }, []);

  if (components.length === 0) {
    return null;
  }

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

    const material = component.materials.find((m) => m!.name == materialName);

    if (!material) {
      return [];
    }

    return material.defects;
  }

  const mapToComboBoxProps = (
    components: ComponentData[]
  ): { label: string; value: string }[] =>
    components.flatMap((c) =>
      c.materials
        .map((m) => ({
          label: `${c.name} • ${m!.name}`,
          value: `${c.name}_${m!.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    );

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
                    <Input
                      register={() =>
                        register(`${typedName}.${index}.name` as const, {
                          required: true,
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
                    const mapValueToColor = (value: RagStatus) => {
                      switch (value) {
                        case "N/I":
                          return "bg-gray-400";
                        case "Red":
                          return "bg-red-400";
                        case "Amber":
                          return "bg-yellow-400";
                        case "Green":
                          return "bg-green-400";
                      }
                    };

                    return (
                      <div {...field}>
                        <Select>
                          <SelectTrigger
                            className={`${mapValueToColor(
                              field.value
                            )} text-white rounded w-10 h-10`}
                          >
                            <SelectValue placeholder="RAG" hidden />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="N/I">N.I</SelectItem>
                            <SelectItem value="Red">Red</SelectItem>
                            <SelectItem value="Amber">Amber</SelectItem>
                            <SelectItem value="Green">Green</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }}
                />
                <Button
                  className="p-2"
                  variant="ghost"
                  onClick={(ev) => remove(index)}
                >
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
                      name={`${typedName}.${index}.defects.${defectIndex}`}
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
  name: string;
}

const DefectCheckbox = ({ defect, name }: DefectCheckboxProps) => {
  const typedName =
    name as `sections.0.elementSections.0.materialComponents.0.defects.0`;
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
              <input
                type="hidden"
                {...register(`${typedName}.name` as const)}
                value={defect.name}
              />
              <TextAreaInput
                labelTitle={defect.name}
                defaultValue={defect.description}
                placeholder={"Defect text..."}
                register={() =>
                  register(`${typedName}.description` as const, {
                    required: true,
                  })
                }
              />
            </div>
          )}
        </div>
      )}
    ></Controller>
  );
};
