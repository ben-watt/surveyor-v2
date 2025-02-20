import React, { useEffect } from "react";

import {
  Input as InputT,
  BuildingSurveyFormData as BuildingSurveyForm,
  FormStatus,
  SurveySection,
} from "./BuildingSurveyReportSchema";

import { useForm, FormProvider } from "react-hook-form";
import InputError from "@/app/app/components/InputError";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MultiFormSection } from "@/app/app/components/FormSection";
import {
  surveyStore,
  sectionStore,
  elementStore,
} from "@/app/app/clients/Database";
import { Section, Element } from "@/app/app/clients/Dexie";
import { fetchUserAttributes } from "aws-amplify/auth";
import { Ok, Result, Err } from "ts-results";
import { useAsyncError } from "@/app/app/hooks/useAsyncError";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { getConditionStatus } from "./Survey";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Zap } from "lucide-react";
import { AddressDisplay } from "@/app/app/components/Address/AddressDisplay";
import { registerQuotaErrorCallback } from "serwist";

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

const createDefaultFormValues = (
  id: string,
  dbSections: Section[],
  dbElements: Element[],
  user: { sub?: string; name?: string; email?: string; picture?: string }
): Result<BuildingSurveyForm, Error> => {
  if (!user.sub || !user.name || !user.email || !user.picture) {
    toast(
      "Your profile is missing some information. Please check you've added all your profile information."
    );
    console.error(user);
    return Err(new Error("Missing user information"));
  }

  // Sort sections by order
  const orderedSections = [...dbSections].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  // Sort elements by order
  const orderedElements = [...dbElements].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  // Create sections array with pre-populated elements
  const formSections: SurveySection[] = orderedSections.map((section) => ({
    id: section.id,
    name: section.name,
    elementSections: orderedElements
      .filter((element) => element.sectionId === section.id)
      .map((element) => ({
        id: element.id,
        name: element.name,
        isPartOfSurvey: true,
        description: element.description || "",
        components: [],
        images: [],
        status: {
          status: FormStatus.Incomplete,
          errors: [],
        },
      })),
  }));

  return Ok<BuildingSurveyForm>({
    id: id,
    status: "draft",
    owner: {
      id: user.sub,
      name: user.name,
      email: user.email,
      signaturePath: user.picture ? [user.picture] : [],
    },
    reportDetails: {
      level: "2",
      address: {
        formatted: "",
        line1: "",
        line2: "",
        line3: "",
        city: "",
        county: "",
        postcode: "",
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
      status: { status: FormStatus.Incomplete, errors: [] },
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
      status: { status: FormStatus.Incomplete, errors: [] },
    },
    sections: formSections,
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
      status: { status: FormStatus.Incomplete, errors: [] },
    },
  });
};

export default function ReportWrapper({ id }: BuildingSurveyFormProps) {
  const [isHydrated, report] = surveyStore.useGet(id);
  const [sectionsHydrated, dbSections] = sectionStore.useList();
  const [elementsHydrated, dbElements] = elementStore.useList();
  const router = useRouter();
  const throwError = useAsyncError();

  useEffect(() => {
    async function createNewForm() {
      console.log("[ReportWrapper] createNewForm");
      const newId = uuidv4();

      try {
        const user = await fetchUserAttributes();
        if (!sectionsHydrated || !elementsHydrated) {
          console.log("[ReportWrapper] waiting for data to hydrate");
          return;
        }

        const formResult = createDefaultFormValues(
          newId,
          dbSections,
          dbElements,
          user
        );
        if (formResult.ok) {
          surveyStore.add({
            id: newId,
            content: formResult.val,
          });

          router.replace(`/app/surveys/${newId}`);
        } else {
          throwError(formResult.val);
        }
      } catch (error) {
        throwError(
          error instanceof Error ? error : new Error("Unknown error occurred")
        );
      }
    }

    console.log("[ReportWrapper] isHydrated", isHydrated);
    console.log("[ReportWrapper] report", report);
    if (isHydrated && !report) {
      createNewForm();
    }
  }, [
    id,
    isHydrated,
    report,
    router,
    throwError,
    sectionsHydrated,
    elementsHydrated,
    dbSections,
    dbElements,
  ]);

  if (!sectionsHydrated || !elementsHydrated) {
    return <div>Loading sections and elements...</div>;
  }

  return (
    <>{report ? <Report initFormValues={report} /> : <div>Loading...</div>}</>
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

  const saveAsDraft = async () => {
    console.log("[BuildingSurveyForm] saveAsDraft", methods.getValues());
    toast.success("Saved As Draft");
    router.push("/app/surveys");
    router.refresh();
  };

  const isFormValid = () => {
    const defaultValues = formState.defaultValues;
    if (!defaultValues) return false;

    const allSectionsComplete = [
      defaultValues.reportDetails?.status?.status,
      defaultValues.propertyDescription?.status?.status,
      defaultValues.checklist?.status?.status,
      getConditionStatus(initFormValues).status,
    ].every((s) => s === FormStatus.Complete);

    return allSectionsComplete;
  };

  const onSubmit = async () => {
    console.log("[BuildingSurveyForm] onSubmit", methods.getValues());

    surveyStore.update(initFormValues.id, (survey) => {
      survey.status = "created";
    });

    toast.success("Saved");
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
      status: initFormValues.propertyDescription.status.status,
    },
    {
      title: "Property Condition",
      href: `/app/surveys/${initFormValues.id}/condition`,
      status: getConditionStatus(initFormValues).status,
    },
    {
      title: "Checklist",
      href: `/app/surveys/${initFormValues.id}/checklist`,
      status: initFormValues.checklist.status.status,
    },
  ];

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>
                    <div>
                      Building Survey Report - Level{" "}
                      {initFormValues.reportDetails.level}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {initFormValues.reportDetails.address.line1 ? (
                      <AddressDisplay
                        address={initFormValues.reportDetails.address}
                        maxLength={31}
                      />
                    ) : (
                      initFormValues.reportDetails.address.formatted ??
                      "No address specified"
                    )}
                  </CardDescription>
                </div>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" className="gap-2">
                        <Zap />
                        <span className="hidden md:inline">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(ev) => {
                          ev.preventDefault();
                          router.push(`/app/editor/${initFormValues.id}`);
                        }}
                        disabled={!isFormValid()}
                      >
                        Generate Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(ev) => saveAsDraft()}>
                        Save As Draft
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(ev) => {
                          ev.preventDefault();
                          handleSubmit(onSubmit, onError)();
                        }}
                        disabled={!isFormValid()}
                      >
                        Save
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 cursor-pointer">
                {formSections.map((section, index) => (
                  <MultiFormSection
                    key={index}
                    title={section.title}
                    href={section.href}
                    status={section.status || FormStatus.Unknown}
                  />
                ))}
              </div>
              <div>
                {Object.values(formState.errors).length > 0 && (
                  <InputError message="Please fix the errors above before saving" />
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}
