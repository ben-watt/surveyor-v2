import React, { useEffect } from "react";

import {
  Input as InputT,
  BuildingSurveyFormData as BuildingSurveyForm,
  FormStatus,
  SurveySection,
} from "./BuildingSurveyReportSchema";

import { useForm, FormProvider } from "react-hook-form";
import InputError from "@/app/home/components/InputError";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MultiFormSection } from "@/app/home/components/FormSection";
import {
  surveyStore,
  sectionStore,
  elementStore,
} from "@/app/home/clients/Database";
import { Section, Element } from "@/app/home/clients/Dexie";
import { fetchUserAttributes } from "aws-amplify/auth";
import { Ok, Result, Err } from "ts-results";
import { useAsyncError } from "@/app/home/hooks/useAsyncError";
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
import { AddressDisplay } from "@/app/home/components/Address/AddressDisplay";
import useUser, { useUserAttributes } from "../../utils/useUser";

interface BuildingSurveyFormProps {
  id: string;
}

const shouldBeTrueCheckBox = (label: string): InputT<boolean> => ({
  type: "checkbox",
  placeholder: "",
  value: false,
  label: label,
  required: true,
  order: 0,
});

const createDefaultFormValues = (
  id: string,
  dbSections: Section[],
  dbElements: Element[],
  user: { sub?: string; name?: string; email?: string; picture?: string }
): Result<BuildingSurveyForm, Error> => {
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
      id: user.sub || "",
      name: user.name || "",
      email: user.email || "",
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
        order: 0,
      },
      constructionDetails: {
        type: "textarea",
        value: "",
        label: "Construction Details",
        placeholder: "Brick, Stone, Timber, Concrete, Steel, Glass, Other",
        required: true,
        order: 1,
      },
      yearOfConstruction: {
        type: "text",
        label: "Year of Construction",
        placeholder: "presumed 1990s - side extension",
        required: true,
        order: 2,
      },
      yearOfExtensions: {
        type: "text",
        label: "Year of Extensions",
        placeholder: "2012",
        required: false,
        order: 3,
      },
      yearOfConversions: {
        type: "text",
        label: "Year of Conversions",
        placeholder: "2004",
        required: false,
        order: 4,
      },
      grounds: {
        type: "textarea",
        value: "",
        label: "Grounds",
        placeholder: "Garden, Yard, Paved, Lawn, Other",
        required: true,
        order: 5,
      },
      services: {
        type: "text",
        value: "",
        label: "Services",
        placeholder:
          "Electricity, Gas, Water, Drainage, Telephone, Broadband, Other",
        required: true,
        order: 6,
      },
      otherServices: {
        type: "text",
        value: "",
        label: "Other Services",
        placeholder: "Cable TV, Satellite TV, Solar Panels, Other",
        required: false,
        order: 7,
      },
      energyRating: {
        type: "text",
        value: "",
        label: "Energy Rating",
        placeholder: "A, B, C, D, E, F, G, Other",
        required: true,
        order: 8,
      },
      numberOfBedrooms: {
        type: "number",
        value: 0,
        label: "Number of Bedrooms",
        placeholder: "Number of Bedrooms",
        required: true,
        order: 9,
      },
      numberOfBathrooms: {
        type: "number",
        value: 0,
        label: "Number of Bathrooms",
        placeholder: "Number of Bathrooms",
        required: true,
        order: 10,
      },
      tenure: {
        type: "select",
        value: "Unknown",
        label: "Tenure",
        placeholder: "Freehold, Leasehold, Commonhold, Other",
        required: true,
        order: 11,
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
  const [isUserHydrated, user] = useUserAttributes();
  const router = useRouter();
  const throwError = useAsyncError();

  useEffect(() => {
    async function createNewForm() {
      console.log("[ReportWrapper] createNewForm");
      const newId = uuidv4();

      try {
        if (!sectionsHydrated || !elementsHydrated) {
          console.log("[ReportWrapper] waiting for data to hydrate");
          return;
        }

        if (!isUserHydrated || !user) {
          console.log("[ReportWrapper] waiting for user to hydrate");
          return;
        }

        console.debug("[ReportWrapper] user", user);

        if (!user.sub || !user.name || !user.email || !user.picture) {
          toast(
            "Your profile is missing some information. Please check you've added all your profile information before creating a survey."
          );
          router.push("/home/profile");
          return;
        }

        const formResult = createDefaultFormValues(
          newId,
          dbSections,
          dbElements,
          user
        );

        if (formResult.ok) {
          await surveyStore.add({
            id: newId,
            content: formResult.val,
          });

          router.replace(`/home/surveys/${newId}`);
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
    if (isHydrated && !report && id === "create") {
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
    isUserHydrated,
    user,
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
    router.push("/home/surveys");
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
      href: `/home/surveys/${initFormValues.id}/report-details`,
      status: initFormValues.reportDetails.status.status,
    },
    {
      title: "Property Description",
      href: `/home/surveys/${initFormValues.id}/property-description`,
      status: initFormValues.propertyDescription.status.status,
    },
    {
      title: "Property Condition",
      href: `/home/surveys/${initFormValues.id}/condition`,
      status: getConditionStatus(initFormValues).status,
    },
    {
      title: "Checklist",
      href: `/home/surveys/${initFormValues.id}/checklist`,
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
                <div className="flex-1">
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
                        maxLength={40}
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
                          router.push(`/home/editor/${initFormValues.id}`);
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
