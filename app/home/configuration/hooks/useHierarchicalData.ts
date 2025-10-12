import { useMemo } from 'react';
import { sectionStore, elementStore, componentStore, phraseStore } from '../../clients/Database';
import { Section, Element, Component, Phrase } from '../../clients/Dexie';

export interface TreeNode {
  id: string;
  type: 'section' | 'element' | 'component' | 'condition';
  name: string;
  data: Section | Element | Component | Phrase;
  children: TreeNode[];
  isExpanded: boolean;
  parentId?: string;
  order?: number;
  invalid?: boolean;
}

interface HierarchicalData {
  isLoading: boolean;
  treeData: TreeNode[];
  sections: Section[];
  elements: Element[];
  components: Component[];
  conditions: Phrase[];
}

export function useHierarchicalData(): HierarchicalData {
  const [sectionsLoaded, sections] = sectionStore.useList();
  const [elementsLoaded, elements] = elementStore.useList();
  const [componentsLoaded, components] = componentStore.useList();
  const [phrasesLoaded, phrases] = phraseStore.useList();

  const isLoading = !sectionsLoaded || !elementsLoaded || !componentsLoaded || !phrasesLoaded;

  const treeData = useMemo(() => {
    if (isLoading) return [];

    return buildHierarchy(sections, elements, components, phrases);
  }, [sections, elements, components, phrases, isLoading]);

  return {
    isLoading,
    treeData,
    sections,
    elements,
    components,
    conditions: phrases,
  };
}

function buildHierarchy(
  sections: Section[],
  elements: Element[],
  components: Component[],
  phrases: Phrase[]
): TreeNode[] {
  // Sort sections by order first
  const sortedSections = sections.sort((a, b) => (a.order || 0) - (b.order || 0));

  return sortedSections.map(section => {
    const sectionInvalid = !section?.name || section.name.trim().length === 0;
    const sectionName = sectionInvalid ? '(Untitled Section)' : section.name;

    const sectionElements = elements
      .filter(element => element.sectionId === section.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const elementNodes: TreeNode[] = sectionElements.map(element => {
      const elementInvalid = !element?.name || element.name.trim().length === 0;
      const elementName = elementInvalid ? '(Untitled Element)' : element.name;
      const elementComponents = components
        .filter(component => component.elementId === element.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const componentNodes: TreeNode[] = elementComponents.map(component => {
        const componentInvalid = !component?.name || component.name.trim().length === 0;
        const componentName = componentInvalid ? '(Untitled Component)' : component.name;
        const componentConditions = phrases
          .filter(phrase => phrase.associatedComponentIds.includes(component.id))
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        const conditionNodes: TreeNode[] = componentConditions.map(condition => {
          const conditionInvalid = !condition?.name || condition.name.trim().length === 0;
          const conditionName = conditionInvalid ? '(Untitled Condition)' : condition.name;
          return ({
          id: `condition-${condition.id}`,
          type: 'condition' as const,
          name: conditionName,
          data: condition,
          children: [],
          isExpanded: false,
          parentId: component.id,
          invalid: conditionInvalid,
        });
        });

        return {
          id: component.id,
          type: 'component' as const,
          name: componentName,
          data: component,
          children: conditionNodes,
          isExpanded: false,
          parentId: element.id,
          invalid: componentInvalid,
        };
      });

      return {
        id: element.id,
        type: 'element' as const,
        name: elementName,
        data: element,
        children: [...componentNodes],
        isExpanded: false,
        parentId: section.id,
        order: element.order ?? undefined,
        invalid: elementInvalid,
      };
    });

    return {
      id: section.id,
      type: 'section' as const,
      name: sectionName,
      data: section,
      children: elementNodes,
      isExpanded: false,
      order: section.order ?? undefined,
      invalid: sectionInvalid,
    };
  });
}
