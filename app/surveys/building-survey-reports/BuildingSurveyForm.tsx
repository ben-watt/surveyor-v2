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
import { CustomToast, toast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import { Combobox } from "@/app/components/Input/ComboBox";
import { Button } from "@/components/ui/button";
import { Schema } from "@/amplify/data/resource";
import { SelectionSet } from "aws-amplify/api";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { InputCheckbox } from "@/app/components/Input/InputCheckbox";
import { FormSection } from "@/app/components/FormSection";
import dynamic from "next/dynamic";
import { db } from "@/app/clients/Database";
import { useDebouncedEffect } from "@/app/hooks/useDebounceEffect";
import { fetchUserAttributes } from "aws-amplify/auth";
import { ComponentPicker } from "./ComponentPicker";
import { Err, Ok, Result } from "ts-results";
import { useAsyncError } from "@/app/hooks/useAsyncError";
import Link from "next/link";

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
            controllerProps={{
              name: registerName,
              rules: { required: input.required },
            }}
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

const createDefaultFormValues = async (
  id: string
): Promise<Result<BuildingSurveyForm, Error>> => {
  const fetchElements = async (): Promise<SurveySection[]> => {
    let initialSections: SurveySection[] = [
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
          const section = initialSections.find(
            (section) => section.name === element.section
          );

          section && section.elementSections.push(elementSection);
        });
    } else {
      Err(new Error("Failed to fetch elements required for the survey."));
    }

    return initialSections;
  };

  const surveySections = await fetchElements();
  const user = await fetchUserAttributes();

  if (!user.sub || !user.name || !user.email || !user.picture) {
    toast.info(
      "Some user information is missing. Please check you've added all your profile information."
    );
  }

  return Ok({
    id: id,
    level: "2",
    reportDate: new Date(),
    owner: {
      id: user.sub || "Unknown",
      name: user.name || "Unknown",
      email: user.email || "Unknown",
      signaturePath: user.picture ? [user.picture] : [],
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
        type: "text",
        label: "Year of Construction",
        placeholder: "presumed 1990s - side extension",
        required: true,
      },
      yearOfExtensions: {
        type: "number",
        label: "Year of Extensinons",
        placeholder: "2012",
        required: false,
      },
      yearOfConversions: {
        type: "number",
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
  });
};

export default function ReportWrapper({ id }: BuildingSurveyFormProps) {
  const [isLoading, report] = db.surveys.useGet(id);
  const [formData, setFormData] = useState<BuildingSurveyForm | undefined>(
    undefined
  );
  const throwError = useAsyncError();

  useEffect(() => {
    async function createNewForm() {
      const formResult = await createDefaultFormValues(id);
      if (formResult.ok) {
        setFormData(formResult.val);
        // Todo: May be worth saving and re-directing here so we don't create a new form on refresh
        // or simply updating the browser history
      } else {
        throwError(formResult.val);
      }
    }

    function parseExistingFormContent(content: string) {
      const formData = JSON.parse(content) as BuildingSurveyForm;
      console.log("[BuildingSurveyForm]", "Loading Existing Form", formData);
      setFormData(formData);
    }

    if (isLoading) {
      return;
    }

    if (report) {
      parseExistingFormContent(report.content as string);
    } else {
      createNewForm();
    }
  }, [id, isLoading, report, throwError]);

  return (
    <>
     {formData ? (
          <Report initFormValues={formData} />
        ) : (
          <div>Loading...</div>
        )}
    </>
  );
}

interface ReportProps {
  initFormValues: BuildingSurveyForm;
}

function Report({ initFormValues }: ReportProps) {
  const methods = useForm<BuildingSurveyForm>({
    defaultValues: initFormValues,
  });

  const { register, handleSubmit, watch, formState } = methods;

  const router = useRouter();

  const sections = watch("sections") as BuildingSurveyForm["sections"];
  const allFields = watch();

  console.log("[BuildingSurveyForm]", "All Fields", allFields);

  useDebouncedEffect(
    () => {
      const autoSave = async () => {
        await db.surveys.upsert(
          {
            id: initFormValues.id,
            content: JSON.stringify(allFields),
          },
          { localOnly: true }
        );

        toast.success("Autosaved");
      };

      if (formState.isDirty) {
        autoSave();
      }
    },
    [allFields],
    10000
  );

  const saveAsDraft = async () => {
    try {
      let form = watch();

      form.status = "draft";

      await db.surveys.upsert(
        {
          id: form.id,
          content: JSON.stringify(form),
        },
        { localOnly: true }
      );

      toast.success("Saved as Draft");

      router.push("/surveys");
    } catch (error) {
      toast.error("Failed to save report");
      console.error(error);
    }
  };

  const onSubmit = async () => {
    try {
      let form = watch();

      form.status = "created";

      console.log("[BuildingSurveyForm]", "Submitting form", form);

      let _ = await db.surveys.upsert({
        id: form.id,
        content: JSON.stringify(form),
      });

      toast.success("Survey Saved");

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
    <div>
      <div>
        <Link href="/surveys/create/report-details">Report Details</Link>
      </div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)}>
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
                    className="border border-grey-600 p-2 m-2 rounded"
                  >
                    <InputToggle
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
                          defaultValues={
                            initFormValues.sections[sectionIndex]
                              .elementSections[i].materialComponents
                          }
                          name={`sections.${sectionIndex}.elementSections.${i}.materialComponents`}
                        />
                      </div>
                    </InputToggle>
                  </section>
                ))}
              </FormSection>
            );
          })}
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
            {initFormValues.status === "draft" && (
              <Button
                className="w-full flex justify-center"
                variant="secondary"
                onClick={saveAsDraft}
              >
                Save As Draft
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
