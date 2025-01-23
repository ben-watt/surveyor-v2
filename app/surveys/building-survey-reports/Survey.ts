import { BuildingSurveyFormData, Component, ElementSection, Phrase, RagStatus, SurveySection } from "./BuildingSurveyReportSchema";

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
  elementId: string,
  elementName: string,
  elementDescription: string = ""
): ElementSection {
  const section = findOrCreateSection(survey, sectionId);
  let elementSection = section.elementSections.find(e => e.id === elementId);
  
  if (!elementSection) {
    elementSection = {
      id: elementId,
      name: elementName,
      isPartOfSurvey: true,
      description: elementDescription,
      components: [],
      images: [],
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
  elementName: string,
  elementDescription: string,
  component: {
    id: string,
    name: string,
    nameOverride?: string,
    useNameOverride?: boolean,
    location?: string,
    additionalDescription?: string,
    images?: string[],
    conditions?: Phrase[],
    ragStatus?: RagStatus,
    budgetCost?: number,
  }
): BuildingSurveyFormData {
  const elementSection = findOrCreateElementSection(survey, sectionId, elementId, elementName, elementDescription);
  
  const existingComponentIndex = elementSection.components.findIndex(
    c => c.id === component.id || 
        (component.useNameOverride && component.nameOverride && c.nameOverride === component.nameOverride) ||
        (!component.useNameOverride && c.name === component.name)
  );

  const componentData: Component = {
    id: component.id,
    name: component.name,
    nameOverride: component.nameOverride || component.name,
    useNameOverride: component.useNameOverride || false,
    location: component.location || "",
    additionalDescription: component.additionalDescription || "",
    images: component.images || [],
    conditions: (component.conditions || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
    })),
    ragStatus: component.ragStatus || "N/I",
    budgetCost: component.budgetCost,
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
  componentId: string
): BuildingSurveyFormData {
  const section = survey.sections.find(s => s.name === sectionName);
  if (!section) return survey;

  const elementSection = section.elementSections.find(e => e.id === elementId);
  if (!elementSection) return survey;

  elementSection.components = elementSection.components.filter(c => c.id !== componentId);
  return survey;
}

// Update element details
export function updateElementDetails(
  survey: BuildingSurveyFormData,
  sectionName: string,
  elementId: string,
  updates: {
    description?: string,
    images?: string[],
  }
): BuildingSurveyFormData {
  const section = survey.sections.find(s => s.name === sectionName);
  if (!section) return survey;

  const elementSection = section.elementSections.find(e => e.id === elementId);
  if (!elementSection) return survey;

  if (updates.description !== undefined) {
    elementSection.description = updates.description;
  }
  if (updates.images !== undefined) {
    elementSection.images = updates.images;
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
  sectionName: string,
  elementId: string
): Component[] {
  const elementSection = getElementSection(survey, sectionName, elementId);
  return elementSection?.components || [];
}

// Find a component by ID and return it along with its context
export function findComponent(
  survey: BuildingSurveyFormData,
  componentId: string
): { 
  component: Component | null,
  elementSection: ElementSection | null,
  section: SurveySection | null 
} {
  for (const section of survey.sections) {
    for (const elementSection of section.elementSections) {
      const component = elementSection.components.find(c => c.id === componentId);
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