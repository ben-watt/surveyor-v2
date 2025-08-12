"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 } from "uuid";
import {
  surveyStore,
  sectionStore,
  elementStore,
} from "@/app/home/clients/Database";
import {
  BuildingSurveyFormData,
  FormStatus,
  Input as InputT,
} from "../building-survey-reports/BuildingSurveyReportSchema";
import { Section, Element } from "@/app/home/clients/Dexie";
import { buildSections } from "../utils/initialiseSurvey";
import { Loader2 } from "lucide-react";
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';

const makeCheckbox = (label: string): InputT<boolean> => ({
  type: "checkbox",
  placeholder: "",
  value: false,
  label,
  required: true,
  order: 0,
});

// buildSections imported from utils

function createDefaultSurvey(
  id: string,
  userId: string,
  userName: string,
  userEmail: string,
  dbSections: Section[],
  dbElements: Element[],
): BuildingSurveyFormData {
  return {
    id,
    owner: {
      id: userId,
      name: userName,
      email: userEmail,
      signaturePath: [],
    },
    status: "draft",
    reportDetails: {
      level: "2",
      reference: "",
      address: {
        formatted: "",
        line1: "",
        line2: "",
        line3: "",
        city: "",
        county: "",
        postcode: "",
        location: { lat: 0, lng: 0 },
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
        placeholder: "Detached, Semi-detached, Terraced, Flat, Bungalow, Other",
        required: true,
        order: 0,
      },
      constructionDetails: {
        type: "textarea",
        value: "",
        label: "Construction Details",
        placeholder:
          "Brick, Stone, Timber, Concrete, Steel, Glass, Other",
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
    sections: buildSections(dbSections, dbElements),
    checklist: {
      items: [
        makeCheckbox("Have you checked for asbestos?"),
        makeCheckbox("Have you lifted manhole covers to drains?"),
        makeCheckbox("Have you checked for Japanese Knotweed?"),
        makeCheckbox(
          "Have you checked external ground levels in relation to DPCs / Air Vents?",
        ),
        makeCheckbox(
          "Have you located services, elecs, gas, water, etc...?",
        ),
        makeCheckbox(
          "Have you checked if chimney breasts been removed internally?",
        ),
        makeCheckbox(
          "Have you checked the locations and severity of all cracks been logged?",
        ),
        makeCheckbox(
          "Have you checked if there are any mature trees in close proximity to the building?",
        ),
        makeCheckbox("I confirm that the information provided is accurate"),
      ],
      status: { status: FormStatus.Incomplete, errors: [] },
    },
  };
}

export default function CreateSurveyPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(true);
  const [sectionsHydrated, dbSections] = sectionStore.useList();
  const [elementsHydrated, dbElements] = elementStore.useList();

  useEffect(() => {
    async function createSurvey() {
      try {
        if (!sectionsHydrated || !elementsHydrated) {
          return;
        }
        // Get current user information
        const user = await getCurrentUser();
        const userAttributes = await fetchUserAttributes();
        
        const userId = user.userId;
        const userName = userAttributes.name || userAttributes.given_name || user.username || 'Unknown User';
        const userEmail = userAttributes.email || 'unknown@example.com';

        const id = v4();
        const newSurvey = createDefaultSurvey(
          id,
          userId,
          userName,
          userEmail,
          dbSections,
          dbElements,
        );
        
        await surveyStore.add({
          id,
          content: newSurvey,
        });

        // Navigate to the new survey
        router.push(`/home/surveys/${id}`);
      } catch (error) {
        console.error("Error creating survey:", error);
        setIsCreating(false);
        // Navigate back to surveys list on error after a brief delay
        setTimeout(() => {
          router.push("/home/surveys");
        }, 2000);
      }
    }

    createSurvey();
  }, [router, sectionsHydrated, elementsHydrated, dbSections, dbElements]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-muted-foreground">
        {isCreating ? "Creating new survey..." : "Error creating survey. Redirecting..."}
      </p>
    </div>
  );
}