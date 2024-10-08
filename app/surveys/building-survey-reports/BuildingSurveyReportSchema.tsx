export type BuildingSurveyFormData = {
    id: string,
    level: "2" | "3"
    owner: {
        id: string,
        name: string,
        email: string,
        signaturePath: string[],
    }
    status: "draft" | "created",
    address: string,
    clientName: string,
    reportDate: Date,
    inspectionDate: Date,
    weather: string,
    orientation: string,
    situation: string,
    propertyDescription: PropertyDescription,
    frontElevationImagesUri: string[]
    moneyShot: string[],
    sections: SurveySection[],
    checklist: Array<Input<boolean>>,
}

export type InputType = "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "boolean"

export type Input<T> = {
    type: InputType,
    value?: T,
    label: string,
    placeholder: string,
    required: boolean
    validate?: (value: T) => boolean,
}

type description = string;
type Year = number;
type roomCount = number;
export type Tenure = "Freehold" | "Leasehold" | "Commonhold" | "Other" | "Unknown";

export type PropertyDescription = {
    propertyType: Input<string>,
    yearOfConstruction: Input<Year>,
    yearOfExtensions: Input<Year>,
    yearOfConversions: Input<Year>,
    constructionDetails: Input<description>,
    grounds: Input<description>,
    services: Input<string>,
    otherServices: Input<string>,
    energyRating: Input<string>,
    numberOfBedrooms: Input<roomCount>,
    numberOfBathrooms: Input<roomCount>,
    tenure: Input<Tenure>,
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
    materialComponents : MaterialComponent[],
    images: string[],
}

export type MaterialComponent = {
    id: string,
    name: string,
    defects: Defect[],
    ragStatus: RagStatus,
    useNameOveride: boolean,
    budgetCost?: number,
}

export type Defect = {
    name: string,
    description: string,
    isChecked: boolean
}

export type RagStatus = "Red" | "Amber" | "Green" | "N/I";