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
    location: {
        lat: number;
        lng: number;
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
    status: "complete" | "incomplete" | "error" | "warning";
    errors: string[];
}
export type InputType = "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "boolean" | "always-true-checkbox"

export type Input<T> = {
    type: InputType,
    value?: T,
    label: string,
    placeholder: string,
    required: boolean,
}

type description = string;
type Year = number;
type roomCount = number;
export type Tenure = "Freehold" | "Leasehold" | "Commonhold" | "Other" | "Unknown";

export type PropertyDescription = {
    propertyType: Input<string>,
    yearOfConstruction: Input<string>,
    yearOfExtensions: Input<string>,
    yearOfConversions: Input<string>,
    constructionDetails: Input<description>,
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
    name: string,
    elementSections: ElementSection[],
}

export type ElementSection = {
    id: string,
    name: string,
    isPartOfSurvey: boolean,
    description: string,
    components: Component[],
    images: string[],
}

export type Component = {
    id: string,
    name: string,
    conditions: Phrase[],
    ragStatus: RagStatus,
    useNameOverride: boolean,
    nameOverride: string,
    budgetCost?: number,
    location: string,
    additionalDescription: string,
    images: string[],
}

export type Phrase = {
    id: string,
    name: string,
    description: string,
}

export type Material = {
    name: string
}

export type RagStatus = "Red" | "Amber" | "Green" | "N/I";