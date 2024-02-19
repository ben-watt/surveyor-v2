export type BuildingSurveyFormData = {
    id: string,
    address: string,
    clientName: string,
    reportDate: Date,   
    frontElevationImage: File[],
    conditionSections: ConditionSection[],
}

export type ConditionSection = {
    name: string,
    isPartOfSurvey: boolean,
    description: string,
    components : Component[],
    images: File[],
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