import { DropZoneInputFile } from "@/app/home/components/InputImage"

export type SurveyStatus =
  | "draft"
  | "ready_for_qa"
  | "issued_to_client"
  | "archived";

export type BuildingSurveyFormData = {
    id: string,
    owner: {
        id: string,
        name: string,
        email: string,
        signaturePath: string[],
    }
    status: SurveyStatus,
    reportDetails: ReportDetails,
    propertyDescription: PropertyDescription,
    sections: SurveySection[],
    checklist: Checklist,
}

export type Checklist = {
    items: Array<Input<boolean>>
}

export type Address = {
    formatted: string;
    line1: string;
    line2?: string;
    line3?: string;
    city: string;
    county?: string;
    postcode: string;
    location: {
        lat: number;
        lng: number;
    };
}

export const formatAddress = (address: Address): string => {
    return [
        address.line1,
        address.line2,
        address.line3,
        address.city,
        address.county,
        address.postcode
    ].filter(Boolean).join('\n');
}

export const mapAddress = (address: Address, fn: (line: string) => any): any[] => {
    return [
        address.line1,
        address.line2,
        address.line3,
        address.city,
        address.county,
        address.postcode
    ].filter(Boolean).map((value) => fn(value as string));
}

// Helper to convert formatted string to Address structure
export const parseFormattedAddress = (formatted: string): Partial<Address> => {
    const lines = formatted.split('\n').map(line => line.trim());
    return {
        formatted,
        line1: lines[0] || '',
        line2: lines[1],
        line3: lines[2],
        city: lines[3] || '',
        county: lines[4],
        postcode: lines[5] || '',
    };
}

export type SurveyImage = {
    path: string,
    isArchived: boolean,
    hasMetadata: boolean,
}

export type ReportDetails = {
    level: "2" | "3"
    reference: string,
    address: Address,
    clientName: string,
    reportDate: Date,
    inspectionDate: Date,
    weather: string,
    orientation: string,
    situation: string,
    moneyShot: SurveyImage[],
    frontElevationImagesUri: SurveyImage[]
}

export type FormSectionStatus = {
    status: FormStatus;
    errors: string[];
}

export enum FormStatus {
    Complete = "complete",
    Incomplete = "incomplete",
    InProgress = "in-progress",
    Error = "error",
    Warning = "warning",
    Unknown = "unknown",
}

export type InputType = "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "boolean" | "always-true-checkbox"


export type Input<T> = {
    type: InputType,
    value?: T,
    label: string,
    placeholder: string,
    required: boolean,
    order: number,
}

export type Tenure = "Freehold" | "Leasehold" | "Commonhold" | "Other" | "Unknown";

export type PropertyDescription = {
    propertyType: string,
    constructionDetails: string,
    yearOfConstruction: string,
    yearOfExtensions?: string,
    yearOfConversions?: string,
    grounds: string,
    services: string,
    otherServices?: string,
    energyRating: string,
    numberOfBedrooms: number,
    numberOfBathrooms: number,
    tenure: string,
}

export type SurveySection = {
    id: string,
    name: string,
    elementSections: ElementSection[],
}

export type ElementSection = {
    id: string,
    name: string,
    isPartOfSurvey: boolean,
    description: string,
    components: Inspection[],
    images: SurveyImage[],
    localComponentDefs?: LocalComponentDef[],
    localConditionDefs?: LocalConditionDef[]
}

export type Inspection = {
    id: string,
    inspectionId: string,
    name: string,
    conditions: Phrase[],
    ragStatus: RagStatus,
    useNameOverride: boolean,
    nameOverride: string,
    location: string,
    additionalDescription: string,
    images: SurveyImage[],
    costings: Costing[],
}

export type Costing = {
    cost: number,
    description: string
}

export type Phrase = {
    id: string,
    name: string,
    phrase: string,
}

export type Material = {
    name: string
}

export type RagStatus = "Red" | "Amber" | "Green" | "N/I";

// Local component definitions are survey-scoped, element-specific templates
export type LocalComponentDef = {
    id: string,
    name: string,
    elementId: string,
    materials?: Material[],
    associatedPhraseIds?: string[],
    createdAt?: string,
    updatedAt?: string,
}

// Local condition definitions are survey-scoped, element-specific reusable phrases
export type LocalConditionDef = {
    id: string,
    name: string,
    text: string,
    createdAt?: string,
    updatedAt?: string,
}
