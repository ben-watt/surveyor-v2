export type BuildingSurveyFormData = {
    id: string,
    address: string,
    clientName: string,
    reportDate: Date,
    inspectionDate: Date,
    weather: string,
    orientation: string,
    situation: string,
    propertyDescription: PropertyDescription,
    frontElevationImagesUri: string[]
    sections: SurveySection[],
}


type InputType = "text" | "number" | "date" | "textarea" | "select";

type Input<T> = {
    type: InputType,
    value: T,
    label: string,
    placeholder: string,
    required: boolean
}

type description = string;
type Year = number;
type roomCount = number;
export type Tenure = "Freehold" | "Leasehold" | "Commonhold" | "Other" | "Unknown";

export type PropertyDescription = {
    propertyType: Input<string>,
    yearOfConstruction: Input<Year>,
    yearOfRefurbishment: Input<Year>,
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
}

export type Defect = {
    name: string,
    description: string,
    isChecked: boolean
}

export type RagStatus = "Red" | "Amber" | "Green" | "N/I";