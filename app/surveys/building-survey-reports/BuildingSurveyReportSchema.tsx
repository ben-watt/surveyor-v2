export type BuildingSurveyFormData = {
    id: string,
    address: string,
    clientName: string,
    reportDate: Date,
    inspectionDate: Date,
    frontElevationImagesUri: string[],
    sections: SurveySection[]
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