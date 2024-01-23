export type BuildingSurveyData = {
    id: number,
    address: string,
    clientName: string,
    reportDate: Date,
    frontElevationImage: FileList,
    conditionSections: ConditionSection[],
}

export type ConditionSection = {
    name: string,
    isPartOfSurvey: boolean,
    description: string,
    defects: Defect[],
    images: FileList,
}

export type Defect = {
    name: string,
    description: string,
    cost: number,
}

export function nameof<T>(key: keyof T, instance?: T): keyof T {
    return key;
}