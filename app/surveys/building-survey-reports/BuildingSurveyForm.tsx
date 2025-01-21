import React, { useEffect } from "react";

import {
  Input as InputT,
  BuildingSurveyFormData as BuildingSurveyForm,
} from "./BuildingSurveyReportSchema";

import {
  useForm,
  FormProvider,
} from "react-hook-form";
import { PrimaryBtn } from "@/app/components/Buttons";
import InputError from "@/app/components/InputError";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MultiFormSection } from "@/app/components/FormSection";
import { surveyStore } from "@/app/clients/Database";
import { fetchUserAttributes } from "aws-amplify/auth";
import { Ok, Result } from "ts-results";
import { useAsyncError } from "@/app/hooks/useAsyncError";
import ReportDetailFormPage from "../[id]/report-details/page";
import PropertyDescriptionPage from "../[id]/property-description/page";
import ChecklistPage from "../[id]/checklist/page";
import ConditionPage from "../[id]/condition/page";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

interface BuildingSurveyFormProps {
  id: string;
}

const shouldBeTrueCheckBox = (label: string): InputT<boolean> => ({
  type: "checkbox",
  placeholder: "",
  value: false,
  label: label,
  required: true,
});

const createDefaultFormValues = async (
  id: string
): Promise<Result<BuildingSurveyForm, Error>> => {
  const user = await fetchUserAttributes();

  if (!user.sub || !user.name || !user.email || !user.picture) {
    toast(
      "Your profile is missing some information. Please check you've added all your profile information."
    );
    console.error(user);
  }

  return Ok({
    id: id,
    status: "draft",
    owner: {
      id: user.sub || "Unknown",
      name: user.name || "Unknown",
      email: user.email || "Unknown",
      signaturePath: user.picture ? [user.picture] : [],
    },
    reportDetails: {
      level: "2",
      address: "",
      clientName: "",
      reportDate: new Date(),
      inspectionDate: new Date(),
      weather: "",
      orientation: "",
      situation: "",
      moneyShot: [],
      frontElevationImagesUri: [],
      status: { status: "incomplete", errors: [] },
    },
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
      status: { status: "incomplete", errors: [] },
    },
    sections: [],
    checklist: {
      items: [
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
      status: { status: "incomplete", errors: [] },
    },
  });
};

export default function ReportWrapper({ id }: BuildingSurveyFormProps) {
  const [isHydrated, report] = surveyStore.useGet(id);

  console.debug("[ReportWrapper] isHydrated", isHydrated, report);

  const throwError = useAsyncError();

  useEffect(() => {
    async function createNewForm() {
      const newId = uuidv4();
      const formResult = await createDefaultFormValues(newId);

      if (formResult.ok) {
        surveyStore.add({
          id: newId,
          content: formResult.val,
        });
        // Todo: May be worth saving and re-directing here so we don't create a new form on refresh
        // or simply updating the browser history
      } else {
        throwError(formResult.val);
      }
    }

    if (isHydrated && !report) {
      createNewForm();
    }
  }, [id, isHydrated, report, throwError]);

  return (
    <>
      {report ? (
        <Report initFormValues={report.content} />
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

  const { handleSubmit, watch, formState } = methods;

  const router = useRouter();

  const sections = watch("sections") as BuildingSurveyForm["sections"];

  // useDebouncedEffect(
  //   () => {
  //     const autoSave = async () => {
  //       await db.surveys.upsert(
  //         {
  //           id: initFormValues.id,
  //           content: JSON.stringify(allFields),
  //         },
  //         { localOnly: true }
  //       );

  //       toast.success("Autosaved");
  //     };

  //     if (formState.isDirty) {
  //       autoSave();
  //     }
  //   },
  //   [allFields],
  //   10000
  // );

  const saveAsDraft = async () => {
    try {
      let form = watch();

      form.status = "draft";
      surveyStore.add({
        id: form.id,
        content: form,
      });

      toast.success("Saved as Draft");

      router.push("/surveys");
    } catch (error) {
      toast.error("Failed to save report");
      console.error(error);
    }
  };

  const onSubmit = async () => {
    // try {
    //   let form = watch();
    //   form.status = "created";
    //   console.log("[BuildingSurveyForm]", "Submitting form", form);
    //   let _ = await db.surveys.upsert({
    //     id: form.id,
    //     content: JSON.stringify(form),
    //   });
    //   toast.success("Survey Saved");
    //   router.push("/surveys");
    // } catch (error) {
    //   toast.error("Failed to save report");
    //   console.error(error);
    // }
  };

  const onError = (errors: any) => {
    console.error(errors);
  };

  const formSections = [
    {
      title: "Report Details",
      href: `/surveys/${initFormValues.id}/report-details`,
      status: initFormValues.reportDetails.status.status,
      drawer: {
        description: "Edit Report Details",
        content: <ReportDetailFormPage params={{ id: initFormValues.id }}  />
      }
    },
    {
      title: "Property Description",
      href: `/surveys/${initFormValues.id}/property-description`,
      status: initFormValues.propertyDescription.status.status,
      drawer: {
        description: "Edit Property Description",
        content: <PropertyDescriptionPage params={{ id: initFormValues.id }} />
      }
    },
    {
      title: "Property Condition",
      href: `/surveys/${initFormValues.id}/condition`,
      status: initFormValues.propertyDescription.status.status,
      drawer: {
        description: "Edit Property Condition",
        content: <ConditionPage params={{ id: initFormValues.id }} />
      }
    },
    {
      title: "Checklist",
      href: `/surveys/${initFormValues.id}/checklist`,
      status: initFormValues.checklist.status.status,
      drawer: {
        description: "Edit Checklist",
        content: <ChecklistPage params={{ id: initFormValues.id }} />
      }
    },
  ];

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <div className="space-y-1">
            {formSections.map((section, index) => (
              <MultiFormSection
                key={index}
                title={section.title}
                href={section.href}
                status={section.status}
                drawer={{
                  title: section.title,
                  description: section.drawer.description,
                  content: section.drawer.content,
                }}
              />
            ))}
          </div>
          <div>
            {Object.values(formState.errors).length > 0 && (
              <InputError message="Please fix the errors above before saving" />
            )}
          </div>
          <div className="space-y-2">
            <PrimaryBtn type="submit">
              Save
            </PrimaryBtn>
            {initFormValues.status === "draft" && (
              <Button
                className="w-full"
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
