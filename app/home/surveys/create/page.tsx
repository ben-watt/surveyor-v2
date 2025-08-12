"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 } from "uuid";
import { surveyStore } from "@/app/home/clients/Database";
import { BuildingSurveyFormData, FormStatus } from "../building-survey-reports/BuildingSurveyReportSchema";
import { Loader2 } from "lucide-react";
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';

function createDefaultSurvey(id: string, userId: string, userName: string, userEmail: string): BuildingSurveyFormData {
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
        city: "",
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
      status: {
        status: FormStatus.Incomplete,
        errors: [],
      },
    },
    propertyDescription: {
      propertyType: {
        type: "text",
        label: "Property Type",
        placeholder: "e.g., Detached House",
        required: true,
        order: 1,
      },
      constructionDetails: {
        type: "textarea",
        label: "Construction Details",
        placeholder: "Describe the construction materials and methods",
        required: true,
        order: 2,
      },
      yearOfConstruction: {
        type: "text",
        label: "Year of Construction",
        placeholder: "e.g., 1950",
        required: false,
        order: 3,
      },
      yearOfExtensions: {
        type: "text",
        label: "Year of Extensions",
        placeholder: "e.g., 1980",
        required: false,
        order: 4,
      },
      yearOfConversions: {
        type: "text",
        label: "Year of Conversions",
        placeholder: "e.g., 2000",
        required: false,
        order: 5,
      },
      grounds: {
        type: "textarea",
        label: "Grounds",
        placeholder: "Describe the grounds and surroundings",
        required: false,
        order: 6,
      },
      services: {
        type: "text",
        label: "Services",
        placeholder: "Available services",
        required: false,
        order: 7,
      },
      otherServices: {
        type: "text",
        label: "Other Services",
        placeholder: "Additional services",
        required: false,
        order: 8,
      },
      energyRating: {
        type: "text",
        label: "Energy Rating",
        placeholder: "e.g., C",
        required: false,
        order: 9,
      },
      numberOfBedrooms: {
        type: "number",
        label: "Number of Bedrooms",
        placeholder: "0",
        required: false,
        order: 10,
      },
      numberOfBathrooms: {
        type: "number",
        label: "Number of Bathrooms",
        placeholder: "0",
        required: false,
        order: 11,
      },
      tenure: {
        type: "select",
        label: "Tenure",
        placeholder: "Select tenure type",
        required: false,
        order: 12,
      },
      status: {
        status: FormStatus.Incomplete,
        errors: [],
      },
    },
    sections: [],
    checklist: {
      items: [],
      status: {
        status: FormStatus.Incomplete,
        errors: [],
      },
    },
  };
}

export default function CreateSurveyPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(true);

  useEffect(() => {
    async function createSurvey() {
      try {
        // Get current user information
        const user = await getCurrentUser();
        const userAttributes = await fetchUserAttributes();
        
        const userId = user.userId;
        const userName = userAttributes.name || userAttributes.given_name || user.username || 'Unknown User';
        const userEmail = userAttributes.email || 'unknown@example.com';

        const id = v4();
        const newSurvey = createDefaultSurvey(id, userId, userName, userEmail);
        
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
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-muted-foreground">
        {isCreating ? "Creating new survey..." : "Error creating survey. Redirecting..."}
      </p>
    </div>
  );
}