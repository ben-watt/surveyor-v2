import { useFormStatus } from "react-dom"

export type BuildingSurveyFormData = {
    id: string,
    owner: {
        id: string,
        name: string,
        email: string,
        signaturePath: string[],
    }
    status: "draft" | "created",
    reportDetails: ReportDetails,
    propertyDescription: PropertyDescription,
    sections: SurveySection[],
    checklist: Checklist,
}

export type Checklist = {
    items: Array<Input<boolean>>,
    status: FormSectionStatus
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

export type ReportDetails = {
    level: "2" | "3"
    address: Address,
    clientName: string,
    reportDate: Date,
    inspectionDate: Date,
    weather: string,
    orientation: string,
    situation: string,
    moneyShot: string[],
    frontElevationImagesUri: string[]
    status: FormSectionStatus
}

export type FormSectionStatus = {
    status: FormStatus;
    errors: string[];
}

export enum FormStatus {
    Complete = "complete",
    Incomplete = "incomplete",
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

type description = string;
type roomCount = number;
export type Tenure = "Freehold" | "Leasehold" | "Commonhold" | "Other" | "Unknown";

export type PropertyDescription = {
    propertyType: Input<string>,
    constructionDetails: Input<description>,
    yearOfConstruction: Input<string>,
    yearOfExtensions: Input<string>,
    yearOfConversions: Input<string>,
    grounds: Input<description>,
    services: Input<string>,
    otherServices: Input<string>,
    energyRating: Input<string>,
    numberOfBedrooms: Input<roomCount>,
    numberOfBathrooms: Input<roomCount>,
    tenure: Input<Tenure>,
    status: FormSectionStatus,
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
    images: string[],
    status: FormSectionStatus
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
    images: string[],
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