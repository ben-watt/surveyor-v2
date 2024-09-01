import React, { useEffect, useState } from "react";

import {
  ElementSection,
  Input as InputT,
  BuildingSurveyFormData as BuildingSurveyForm,
  InputType,
  SurveySection,
} from "./BuildingSurveyReportSchema";

import {
  useForm,
  FormProvider,
  UseFormRegister,
  FieldValues,
  Path,
} from "react-hook-form";
import { InputToggle } from "../../components/Input/InputToggle";
import { PrimaryBtn } from "@/app/components/Buttons";
import Input from "../../components/Input/InputText";
import InputDate from "../../components/Input/InputDate";
import SmartTextArea from "../../components/Input/SmartTextArea";
import InputError from "@/app/components/InputError";
import reportClient from "@/app/clients/AmplifyDataClient";
import { successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import { Combobox } from "@/app/components/Input/ComboBox";
import { Button } from "@/components/ui/button";
import { Schema } from "@/amplify/data/resource";
import { SelectionSet } from "aws-amplify/api";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import toast from "react-hot-toast";
import { InputCheckbox } from "@/app/components/Input/InputCheckbox";
import { FormSection } from "@/app/components/FormSection";
import dynamic from "next/dynamic";
import { db } from "@/app/clients/Database";
import { useDebouncedEffect } from "@/app/hooks/useDebounceEffect";
import {
  fetchUserAttributes,
} from "aws-amplify/auth";
import { ComponentPicker } from "./ComponentPicker";

const ImageInput = dynamic(
  () =>
    import("@/app/components/Input/UppyInputImage").then(
      (x) => x.input.rhfImage
    ),
  { ssr: false }
);

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
          rhfProps={{
            name: registerName,
            rules: { required: input.required, validate: input.validate },
          }}
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
          register={() =>
            register(registerName, {
              required: input.required,
              validate: input.validate,
            })
          }
        />
      );
  }
}

interface BuildingSurveyFormProps {
  id: string;
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

const shouldBeTrueCheckBox = (label: string): InputT<boolean> => ({
  type: "checkbox",
  placeholder: "",
  value: false,
  label: label,
  required: true,
  validate: (value: boolean) => value === true,
});


const createDefaultFormValues = async (id: string): Promise<BuildingSurveyForm> => {
  const fetchElements = async () : Promise<SurveySection[]> => {
    let initialSections : SurveySection[] = [
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
    ];

    const createDefaultElementSection = (
      element: ElementData
    ): ElementSection => ({
      id: element.id,
      name: element.name,
      isPartOfSurvey: false,
      description: "",
      images: [],
      materialComponents: [],
    });

    try {
      const response = await reportClient.models.Elements.list({
        selectionSet: selectionSetElement,
      });

      if (response.data) {
        response.data
          .sort((x, y) => {
            let a = x.order ? x.order : 0;
            let b = y.order ? y.order : 0;
            return a - b;
          })
          .map((element) => {
            const elementSection = createDefaultElementSection(element);
            const section = initialSections.find((section) => section.name === element.section)
            if(section) {
              section.elementSections.push(elementSection);
            }
            else {
              console.error("Failed to find section for element", element);
            }
          });
      }
    } catch (error) {
      console.error("Failed to fetch elements", error);
    }

    return initialSections;
  };

  const surveySections = await fetchElements();
  const user = await fetchUserAttributes();
  if(!user.sub || !user.name || !user.email || !user.picture) {
    console.error("Unable to verify user.", user);
    throw new Error("Unable to verify user.");
  }
    

  return {
    id: id,
    level: "2",
    reportDate: new Date(),
    owner: {
      id: user.sub,
      name: user.name,
      email: user.email,
      signaturePath: [user.picture],
    },
    status: "draft",
    address: "",
    clientName: "",
    inspectionDate: new Date(),
    weather: "",
    orientation: "",
    situation: "",
    moneyShot: [],
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
      yearOfExtensions: {
        type: "number",
        value: 0,
        label: "Year of Extensinons",
        placeholder: "2012",
        required: false,
      },
      yearOfConversions: {
        type: "number",
        value: 0,
        label: "Year of Conversions",
        placeholder: "2004",
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
    sections: surveySections,
    checklist: [
      shouldBeTrueCheckBox("Have you checked for asbestos?"),
      shouldBeTrueCheckBox("Have you lifted manhole covers to drains?"),
      shouldBeTrueCheckBox("Have you checked for Japanese Knotweed?"),
      shouldBeTrueCheckBox(
        "Have you checked external ground levels in relation to DPCs / Air Vents?"
      ),
      shouldBeTrueCheckBox(
        "Have you located services, elecs, gas, water, etc...?"
      ),
      shouldBeTrueCheckBox(
        "Have you checked if chimney breasts been removed internally?"
      ),
      shouldBeTrueCheckBox(
        "Have you checked the locations and severity of all cracks been logged?"
      ),
      shouldBeTrueCheckBox(
        "Have you checked if there are any mature trees in close proximity to the building?"
      ),
      shouldBeTrueCheckBox(
        "I confirm that the information provided is accurate"
      ),
    ],
  };
}


export default function ReportWrapper ({ id }: BuildingSurveyFormProps) {
  const [isLoading, report] = db.surveys.useGet(id);
  const [formData, setFormData] = useState<BuildingSurveyForm | undefined>(undefined);

  useEffect(() => {
    async function createNewForm() {
      setFormData(await createDefaultFormValues(id));
    }

    function parseExistingFormContent(content : string) {
      const formData = JSON.parse(content) as BuildingSurveyForm;
      setFormData(formData);
    }

    if(isLoading) {
      return;
    }

    if(report) {
      parseExistingFormContent(report.content as string);
    }
    else {
      createNewForm()
    }
  }, [id, isLoading, report])

  return (
    <div className="md:grid md:grid-cols-4 mb-4">
    <div className="col-start-2 col-span-2">
      {formData ? <Report initFormValues={formData} /> : <div>Loading...</div>}
    </div>
  </div>
  )

}

interface ReportProps {
  initFormValues: BuildingSurveyForm;
}

function Report({ initFormValues }: ReportProps) {
  const methods = useForm<BuildingSurveyForm>({ defaultValues: initFormValues });
  const { register, handleSubmit, watch, formState, control } =
    methods;

  const router = useRouter();

  const sections = watch("sections") as BuildingSurveyForm["sections"];
  const allFields = watch();

  useDebouncedEffect(
    () => {
      const autoSave = async () => {
          await db.surveys.upsert(
            {
              id: initFormValues.id,
              status: initFormValues.status,
              content: JSON.stringify(allFields),
            }, { localOnly: true });

          toast.success("Autosaved")
      };

      if(formState.isDirty){
        autoSave();
      }
    },
    [allFields],
    10000
  );

  const saveAsDraft = async () => {
    try {
      let form = watch();

      await db.surveys.upsert({
        id: form.id,
        status: "draft",
        content: JSON.stringify(form),
      }, { localOnly: true });

      successToast("Saved as Draft");

      router.push("/surveys");
    } catch (error) {
      toast.error("Failed to save report");
      console.error(error);
    }
  }


  const onSubmit = async () => {
    try {
      let form = watch();

      form.status = "created";
      
      let _ = db.surveys.upsert({
        id: form.id,
        status: "created",
        content: JSON.stringify(form),
      });

      successToast("Survey Saved");

      router.push("/surveys");
    } catch (error) {
      toast.error("Failed to save report");
      console.error(error);
    }
  };

  const onError = (errors: any) => {
    console.error(errors);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onError)}>
        <div>
          <div className="space-y-4">
            <div>
              <Combobox
                labelTitle="Level"
                data={[
                  { label: "Level 2", value: "2" },
                  { label: "Level 3", value: "3" },
                ]}
                register={() => register("level", { required: true })}
              />
            </div>
            <div>
              <Input
                labelTitle="Address"
                placeholder="123 Main St, London, UK"
                register={() => register("address", { required: true })}
              />
            </div>
            <div>
              <Input
                labelTitle="Client"
                placeholder="Mr John Doe"
                register={() => register("clientName", { required: true })}
              />
            </div>
            <div>
              <InputDate
                labelTitle="Inspection Date"
                controllerProps={{
                  name: "inspectionDate",
                  rules: {
                    required: true,
                    validate: (v) =>
                      v < new Date() || "Date cannot be in the future",
                  },
                }}
              />
            </div>
            <div>
              <Input
                labelTitle="Weather"
                placeholder="Sunny, clear, 20°C"
                register={() => register("weather", { required: true })}
              />
            </div>
            <div>
              <TextAreaInput
                labelTitle="Orientation"
                register={() => register("orientation", { required: true })}
              />
            </div>
            <div>
              <TextAreaInput
                labelTitle="Situation"
                register={() => register("situation", { required: true })}
              />
            </div>
            <div>
              <ImageInput
                labelText="Money Shot"
                rhfProps={{
                  name: "moneyShot",
                  rules: {
                    validate: (v) =>
                      v.length == 1 || "Only one image is required",
                  },
                }}
                minNumberOfFiles={1}
                maxNumberOfFiles={1}
                path={`report-images/${initFormValues.id}/moneyShot/`}
              />
            </div>
            <div>
              <ImageInput
                labelText="Front Elevation Images"
                rhfProps={{
                  name: "frontElevationImagesUri",
                  rules: { validate: (v) => v.length > 0 || "At least one elevation image is required" },
                }}
                path={`report-images/${initFormValues.id}/frontElevationImages/`}
              />
            </div>
          </div>
          <FormSection title="Property Description">
            {Object.keys(initFormValues.propertyDescription)?.map((key) => {
              const propKey =
                key as keyof typeof initFormValues.propertyDescription;
              const property = initFormValues.propertyDescription[
                propKey
              ] as InputT<InputType>;
              const reqName = `propertyDescription.${propKey}.value` as const;

              return (
                <div key={key} className="mt-1 mb-1">
                  {mapToInputType(property, reqName, register)}
                </div>
              );
            })}
          </FormSection>
          {sections.map((section, sectionIndex) => {
            return (
              <FormSection
                title={section.name}
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
                              `sections.${sectionIndex}.elementSections.${i}.description`,
                              { required: true, shouldUnregister: true }
                            )
                          }
                        />
                        <div>
                          <ImageInput
                            rhfProps={{
                              name: `sections.${sectionIndex}.elementSections.${i}.images`,
                              rules: {
                                validate: (v) =>
                                  v.length > 0 ||
                                  "At least one image is required",
                                shouldUnregister: true,
                              },
                            }}
                            path={`report-images/${initFormValues.id}/elementSections/${i}/images/`}
                          />
                        </div>
                        <ComponentPicker
                          elementId={elementSection.id}
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
          {initFormValues.checklist.map((checklist, index) => {
            return (
              <div className="mt-4 mb-4" key={index}>
                <div>
                  {mapToInputType(
                    checklist,
                    `checklist.${index}.value`,
                    register
                  )}
                </div>
              </div>
            );
          })}
        </FormSection>
        <div>
          {Object.values(formState.errors).length > 0 && (
            <InputError message="Please fix the errors above before saving" />
          )}
        </div>
        <div className="space-y-2">
          <PrimaryBtn className="w-full flex justify-center" type="submit">
            Save
          </PrimaryBtn>
          <Button
            className="w-full flex justify-center"
            variant="secondary"
            onClick={saveAsDraft}
          >
            Save As Draft
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}