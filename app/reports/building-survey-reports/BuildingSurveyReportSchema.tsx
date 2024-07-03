export type BuildingSurveyFormData = {
    id: string,
    address: string,
    clientName: string,
    reportDate: Date,   
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
    ragStatus: RagStatus
    description: string,
    components : Component[],
    images: string[],
}

export type Component = {
    type: string,
    name: string,
    defects: Defect[]
}

export type Defect = {
    name: string,
    description: string,
    isChecked: boolean,
    condition: RagStatus,
}

export type RagStatus = "Red" | "Amber" | "Green" | "N/A";