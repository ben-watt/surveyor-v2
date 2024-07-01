export type BuildingSurveyFormData = {
    id: string,
    address: string,
    clientName: string,
    reportDate: Date,   
    frontElevationImagesUri: string[],
    sections: SurveySection[],
    elementSections: ElementSection[],
}

export type SurveySection = {
    name: string,
    elementSections: ElementSection[],
}

export type ElementSection = {
    name: string,
    isPartOfSurvey: boolean,
    description: string,
    components : Component[],
    images: string[],
}

export type Component = {
    name: string,
    defects: Defect[],
    conditions: Condition[]
}

export type Condition = {
    description : string
}

export type Defect = {
    name: string,
    description: string,
    cause: string,
    implications: string,
    treatment: string,
    cost: number,
}

export function nameof<T>(key: keyof T, instance?: T): keyof T {
    return key;
}