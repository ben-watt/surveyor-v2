import { matchSorter } from 'match-sorter';
import { ElementData, ComponentData, PhraseData, LocationData } from "../types";
import { getCurrentTenantId } from '../../utils/tenant-utils';

interface SeedElement {
  id: string;
  name: string;
  description?: string | null;
  sectionId?: string;
  order?: number;
}

interface BodDefect {
  type: string;
  specification: string;
  defect: string;
  level2Wording?: string;
  level3Wording?: string;
}

interface BodSheet {
  elementName: string;
  defects: BodDefect[];
}

interface SeedLocation {
  id: string;
  value: string;
  label: string;
  parentId?: string | null;
}

export async function mapElementsToElementData(elements: SeedElement[]): Promise<ElementData[]> {
  const tenantId = await getCurrentTenantId();
  return elements.map(element => ({
    id: element.id,
    name: element.name,
    description: element.description || null,
    sectionId: element.sectionId || "",
    order: element.order || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantId: tenantId || "",
    sectionTenantId: tenantId || "",
  }));
}


export async function mapBodToComponentData(bod: BodSheet[], elements: ElementData[]): Promise<ComponentData[]> {
  const componentData: ComponentData[] = [];
  const componentIds = new Map<string, string>();
  
  bod.forEach((sheet) => {
    sheet.defects.forEach(async (d) => {
      const componentKey = `${d.type}:${d.specification}`;
      let componentId = componentIds.get(componentKey);
      if (!componentId) {
        componentId = crypto.randomUUID();
        componentIds.set(componentKey, componentId);
      }

      const existingComponent = componentData.find(c => c.name === d.type);
      if (existingComponent) {
        const existingMaterial = existingComponent.materials.find(m => m.name === d.specification);
        if (!existingMaterial) {
          existingComponent.materials.push({ name: d.specification });
        }
      } else {
        const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
        const tenantId = await getCurrentTenantId();
        componentData.push({
          id: componentId,
          elementId: matchingElement?.id || "",
          name: d.type,
          materials: [{ name: d.specification }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          elementTenantId: tenantId || "",
        });
      }
    });
  });


  return componentData;
}

export function mapBodToPhraseData(bod: BodSheet[], elements: ElementData[], components: ComponentData[]): PhraseData[] {
  const phrases: PhraseData[] = [];
  
  bod.forEach((sheet) => {
    const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
    if (!matchingElement?.id) return;

    sheet.defects.forEach((d) => {
      const matchingComponent = components.find(c => 
        c.name === d.type && 
        c.materials.some(m => m.name === d.specification)
      );

      if (!matchingComponent) {
        console.warn(`No matching component found for type: ${d.type} and specification: ${d.specification}`);
        return;
      }

      const phraseName = `${d.defect}`;
      const level2 = (d.level2Wording || "") as string;
      const level3 = (d.level3Wording || "") as string;
      const phraseText = level2.trim() || level3.trim() || "No description available";

      if (!phrases.some(p => p.name === phraseName)) {
        phrases.push({
          id: crypto.randomUUID(),
          name: phraseName,
          type: "Condition",
          associatedMaterialIds: [d.specification],
          associatedElementIds: matchingElement.id ? [matchingElement.id] : [],
          associatedComponentIds: matchingComponent.id ? [matchingComponent.id] : [],
          phrase: phraseText,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  });

  return phrases;
}

export function prepareLocationData(locations: SeedLocation[]): LocationData[] {
  return locations.map(location => ({
    id: location.id,
    name: location.label, 
    parentId: location.parentId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

} 