import { Section, Element } from "@/app/home/clients/Dexie";
import { FormStatus, SurveySection } from "../building-survey-reports/BuildingSurveyReportSchema";

/**
 * Build survey sections with element sections from configured Sections and Elements.
 * Ensures both sections and elements are ordered by their `order` property.
 */
export function buildSections(
  dbSections: Section[],
  dbElements: Element[],
): SurveySection[] {
  const orderedSections = [...dbSections].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );
  const orderedElements = [...dbElements].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  return orderedSections.map(section => ({
    id: section.id,
    name: section.name,
    elementSections: orderedElements
      .filter(element => element.sectionId === section.id)
      .map(element => ({
        id: element.id,
        name: element.name,
        isPartOfSurvey: true,
        description: element.description || "",
        components: [],
        images: [],
      })),
  }));
}


