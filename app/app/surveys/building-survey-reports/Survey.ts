import { BuildingSurveyFormData, Inspection, ElementSection, Phrase, RagStatus, SurveySection, Costing, FormSectionStatus, FormStatus } from "./BuildingSurveyReportSchema";

// Find or create a section
function findOrCreateSection(survey: BuildingSurveyFormData, sectionId: string): SurveySection {
  let section = survey.sections.find(s => s.id === sectionId);
  if (!section) {
    section = {
      id: sectionId,
      name: "",
      elementSections: [],
    };
    survey.sections.push(section);
  }
  return section;
}

// Find or create an element section
function findOrCreateElementSection(
  survey: BuildingSurveyFormData,
  sectionId: string,
  elementId: string
): ElementSection {
  const section = findOrCreateSection(survey, sectionId);
  let elementSection = section.elementSections.find(e => e.id === elementId);
  
  if (!elementSection) {
    elementSection = {
      id: elementId,
      name: "",
      isPartOfSurvey: true,
      description: "",
      components: [],
      images: [],
      status: {
        status: FormStatus.Incomplete,
        errors: [],
      },

    };
    section.elementSections.push(elementSection);
  }

  
  return elementSection;
}

// Add or update a component
export function addOrUpdateComponent(
  survey: BuildingSurveyFormData,
  sectionId: string,
  elementId: string,
  component: {
    id: string,
    inspectionId: string,
    name: string,
    nameOverride?: string,
    useNameOverride?: boolean,
    location?: string,
    additionalDescription?: string,
    images?: string[],
    conditions?: Phrase[],
    ragStatus?: RagStatus,
    costings?: Costing[],
  }
): BuildingSurveyFormData {
  const elementSection = findOrCreateElementSection(survey, sectionId, elementId);
  
  const existingComponentIndex = elementSection.components.findIndex(
    c => c.inspectionId === component.inspectionId
  );

  const componentData: Inspection = {
    id: component.id,
    inspectionId: component.inspectionId,
    name: component.name,
    nameOverride: component.nameOverride || component.name,
    useNameOverride: component.useNameOverride || false,
    location: component.location || "",
    additionalDescription: component.additionalDescription || "",
    images: component.images || [],
    conditions: (component.conditions || []).map(p => ({
      id: p.id,
      name: p.name,
      phrase: p.phrase || "",
    })),
    ragStatus: component.ragStatus || "N/I",
    costings: component.costings || [],
  };

  if (existingComponentIndex !== -1) {
    elementSection.components[existingComponentIndex] = componentData;
  } else {
    elementSection.components.push(componentData);
  }

  return survey;
}

// Remove a component
export function removeComponent(
  survey: BuildingSurveyFormData,
  sectionName: string,
  elementId: string,
  inspectionId: string
): BuildingSurveyFormData {
  const section = survey.sections.find(s => s.name === sectionName);
  if (!section) return survey;

  const elementSection = section.elementSections.find(e => e.id === elementId);
  if (!elementSection) return survey;

  elementSection.components = elementSection.components.filter(c => c.inspectionId !== inspectionId);
  return survey;
}

// Update element details
export function updateElementDetails(
  survey: BuildingSurveyFormData,
  sectionId: string,
  elementId: string,
  updates: Partial<ElementSection>
): BuildingSurveyFormData {
  const section = survey.sections.find(s => s.id === sectionId);
  if (!section) return survey;

  const elementSection = section.elementSections.find(e => e.id === elementId);
  if (!elementSection) return survey;

  if (updates.description !== undefined) {
    elementSection.description = updates.description;
  }
  if (updates.images !== undefined) {
    elementSection.images = updates.images;
  }

  if (updates.status !== undefined) {
    elementSection.status = updates.status;
  }

  return survey;
}

// Get an element section
export function getElementSection(
  survey: BuildingSurveyFormData,
  sectionId: string,
  elementId: string
): ElementSection | null {
  const section = survey.sections.find(s => s.id === sectionId);
  if (!section) return null;

  return section.elementSections.find(e => e.id === elementId) || null;
}

// Get all components for an element
export function getElementComponents(
  survey: BuildingSurveyFormData,
  sectionId: string,
  elementId: string
): Inspection[] {
  const elementSection = getElementSection(survey, sectionId, elementId);
  return elementSection?.components || [];
}

// Find a component by ID and return it along with its context
export function findComponent(
  survey: BuildingSurveyFormData,
  componentId: string
): { 
  component: Inspection | null,
  elementSection: ElementSection | null,
  section: SurveySection | null 
} {
  for (const section of survey.sections) {
    for (const elementSection of section.elementSections) {
      const component = elementSection.components.find(c => 
        c.inspectionId === componentId || c.id === componentId
      );
      if (component) {
        return {
          component,
          elementSection,
          section
        };
      }
    }
  }
  return {
    component: null,
    elementSection: null,
    section: null
  };
}

// Remove an element section
export function excludeElementSection(
  survey: BuildingSurveyFormData,
  sectionId: string,
  elementId: string
): BuildingSurveyFormData {
  const section = survey.sections.find(s => s.id === sectionId);
  if (!section) return survey;

  const elementSection = section.elementSections.find(e => e.id === elementId);
  if (!elementSection) return survey;

  elementSection.isPartOfSurvey = false;
  return survey;
}


// Get all images from a survey
export function getAllSurveyImages(survey: BuildingSurveyFormData): string[] {
    const allImages: string[] = [];

    survey.reportDetails?.moneyShot?.forEach(image => {
        allImages.push(image);
    });

    survey.reportDetails?.frontElevationImagesUri?.forEach(image => {
        allImages.push(image);
    });

    survey.sections.forEach(section => {
        section.elementSections.forEach(elementSection => {
            if (elementSection.images) {
                allImages.push(...elementSection.images);
            }

            elementSection.components.forEach(component => {
                if (component.images) {
                    allImages.push(...component.images);
                }
            });
        });

    });

    return Array.from(new Set(allImages));
} 

export function getConditionStatus(survey: BuildingSurveyFormData): FormSectionStatus {
  console.log("[getConditionStatus] survey", survey);

  const allElementsComplete = survey.sections.every(s => s.elementSections.every(e => e.status?.status === FormStatus.Complete))
  const allElementsHaveAtLeastOneComponent = survey.sections.every(s => s.elementSections.every(e => e.components.length > 0))

  console.log("[getConditionStatus] allElementsComplete", allElementsComplete);
  console.log("[getConditionStatus] allElementsHaveAtLeastOneComponent", allElementsHaveAtLeastOneComponent);


  if (allElementsComplete && allElementsHaveAtLeastOneComponent) {
    return {
      status: FormStatus.Complete,
      errors: [],
    };
  } else {
    return {
      status: FormStatus.Incomplete,
      errors: survey.sections.flatMap(s => s.elementSections.filter(e => e.isPartOfSurvey).flatMap(e => e.status?.errors || [])),
    };
  }
}