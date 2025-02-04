import React, { useEffect } from "react";

import {
  Input as InputT,
  BuildingSurveyFormData as BuildingSurveyForm,
} from "./BuildingSurveyReportSchema";

import {
  useForm,
  FormProvider,
} from "react-hook-form";
import { PrimaryBtn } from "@/app/app/components/Buttons";
import InputError from "@/app/app/components/InputError";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MultiFormSection } from "@/app/app/components/FormSection";
import { surveyStore } from "@/app/app/clients/Database";
import { fetchUserAttributes } from "aws-amplify/auth";
import { Ok, Result } from "ts-results";
import { useAsyncError } from "@/app/app/hooks/useAsyncError";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import seedSectionData from "@/app/app/settings/sections.json";
import seedElementData from "@/app/app/settings/elements.json";

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

  // Sort sections by order
  const orderedSections = [...seedSectionData].sort((a, b) => a.order - b.order);
  
  // Sort elements by order and group by sectionId
  const orderedElements = [...seedElementData].sort((a, b) => a.order - b.order);

  // Create sections array with pre-populated elements
  const sections = orderedSections.map(section => ({
    id: section.id,
    name: section.name,
    elementSections: orderedElements
      .filter(element => element.sectionId === section.id)
      .map(element => ({
        id: element.id,
        name: element.name,
        isPartOfSurvey: true,
        description: element.description || "",
        components: [],
        images: [],
      })),
  }));

  return Ok<BuildingSurveyForm>({
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
      address: {
        formatted: "",
        location: {
          lat: 0,
          lng: 0,
        },
      },
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
        type: "text",
        label: "Year of Extensions",
        placeholder: "2012",
        required: false,
      },
      yearOfConversions: {
        type: "text",
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
    sections: sections,
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
  const router = useRouter();

  console.debug("[ReportWrapper] isHydrated", isHydrated, report);

  const throwError = useAsyncError();
  
  useEffect(() => {
    async function createNewForm() {
      console.log("[ReportWrapper] createNewForm");
      const newId = uuidv4();
      const formResult = await createDefaultFormValues(newId);

      if (formResult.ok) {
        surveyStore.add({
          id: newId,
          content: formResult.val,
        });

        router.push(`/app/surveys/${newId}`);
      } else {
        throwError(formResult.val);
      }
    }

    console.log("[ReportWrapper] isHydrated", isHydrated);
    console.log("[ReportWrapper] report", report);
    if (isHydrated && !report) {
      createNewForm();
    }
  }, [id, isHydrated, report, router, throwError]);

  return (
    <>
      {report ? (
        <Report initFormValues={report} />
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

  const { handleSubmit, formState } = methods;

  const router = useRouter();

  const saveAsDraft = async (ev: React.FormEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    console.log("[BuildingSurveyForm] saveAsDraft", methods.getValues());
    toast.success("Saved As Draft");
    router.push("/app/surveys");
    router.refresh();
  };
  const isFormValid = () => {
    const defaultValues = formState.defaultValues;
    if (!defaultValues) return false;

    return defaultValues.reportDetails?.status?.status === "complete" &&
      defaultValues.propertyDescription?.status?.status === "complete" &&
      defaultValues.checklist?.status?.status === "complete";
  }

  const onSubmit = async () => {
    console.log("[BuildingSurveyForm] onSubmit", methods.getValues());
    
    surveyStore.update(initFormValues.id, (survey) => {
      survey.status = "created";
    });

    toast.success("Saved");
    router.push("/app/surveys");
  };

  const onError = (errors: any) => {
    console.error(errors);
  };

  const formSections = [
    {
      title: "Report Details",
      href: `/app/surveys/${initFormValues.id}/report-details`,
      status: initFormValues.reportDetails.status.status,
    },
    {
      title: "Property Description",
      href: `/app/surveys/${initFormValues.id}/property-description`,
      status: initFormValues.propertyDescription.status.status
    },
    {
      title: "Property Condition",
      href: `/app/surveys/${initFormValues.id}/condition`,
    },
    {
      title: "Checklist",
      href: `/app/surveys/${initFormValues.id}/checklist`,
      status: initFormValues.checklist.status.status
    },
  ];

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <div className="space-y-1 cursor-pointer">
            {formSections.map((section, index) => (
              <MultiFormSection
                key={index}
                title={section.title}
                href={section.href}
                status={section.status || "none"}
              />
            ))}
          </div>
          <div>
            {Object.values(formState.errors).length > 0 && (
              <InputError message="Please fix the errors above before saving" />
            )}
          </div>
          <div className="space-y-2">
            <PrimaryBtn type="submit" disabled={!isFormValid()}>
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
