import { RagStatus } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";

export type FormPhrase = {
  id: string;
  name: string;
  phrase: string;
};

export type InspectionFormData = {
  inspectionId: string;  // Unique identifier for this specific inspection
  location: string;
  surveySection: {
    id: string;
    name: string;
  };
  element: {
    id: string;
    name: string;
  };
  component: {
    id: string;
    name: string;
  };
  nameOverride: string;
  useNameOverride: boolean;
  additionalDescription: string;
  images: string[];
  ragStatus: RagStatus;
  conditions: FormPhrase[];
};

export interface InspectionFormProps {
  surveyId: string;
  componentId?: string; // Optional - if provided, will pre-populate form from survey data
  defaultValues?: Partial<InspectionFormData>;
}

export const RAG_OPTIONS = [
  { value: "Red", label: "Red" },
  { value: "Amber", label: "Amber" },
  { value: "Green", label: "Green" },
  { value: "N/I", label: "Not Inspected" },
] as const; 