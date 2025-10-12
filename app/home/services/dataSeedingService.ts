import { componentStore, elementStore, phraseStore, sectionStore } from '../clients/Database';
import { getCurrentTenantId, withTenantId } from '../utils/tenant-utils';
import {
  mapBodToComponentData,
  mapBodToPhraseData,
  mapElementsToElementData,
} from '../settings/utils/mappers';

// Import the seed data
import bankOfDefects from '../settings/defects.json';
import seedSectionData from '../settings/sections.json';
import seedElementData from '../settings/elements.json';

export interface SeedingProgress {
  currentStep: string;
  totalSteps: number;
  currentStepIndex: number;
  isComplete: boolean;
}

export type SeedingProgressCallback = (progress: SeedingProgress) => void;

/**
 * Seeds initial data for new users
 * This includes sections, elements, components, and phrases
 */
export async function seedInitialData(onProgress?: SeedingProgressCallback): Promise<void> {
  const steps = ['sections', 'elements', 'components', 'phrases'];
  let currentStepIndex = 0;

  const updateProgress = (step: string) => {
    if (onProgress) {
      onProgress({
        currentStep: step,
        totalSteps: steps.length,
        currentStepIndex,
        isComplete: false,
      });
    }
    currentStepIndex++;
  };

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available for seeding data');
    }

    // Step 1: Seed sections
    updateProgress('Setting up survey sections...');
    console.log('[seedInitialData] Seeding sections');

    for (const section of seedSectionData) {
      await sectionStore.add({
        id: `${section.id}#${tenantId}`,
        name: section.name,
        order: section.order,
      } as any);
    }

    // Step 2: Seed elements
    updateProgress('Setting up building elements...');
    console.log('[seedInitialData] Seeding elements');

    const mappedElements = await mapElementsToElementData(seedElementData);
    for (const element of mappedElements) {
      await elementStore.add(element);
    }

    // Step 3: Seed components
    updateProgress('Setting up building components...');
    console.log('[seedInitialData] Seeding components');

    const createdComponents = await mapBodToComponentData(bankOfDefects, mappedElements);
    for (const component of createdComponents) {
      const componentWithTenant = await withTenantId(component);
      await componentStore.add(componentWithTenant);
    }

    // Step 4: Seed phrases
    updateProgress('Setting up inspection phrases...');
    console.log('[seedInitialData] Seeding phrases');

    const phrases = await mapBodToPhraseData(bankOfDefects, mappedElements, createdComponents);
    for (const phrase of phrases) {
      const phraseWithTenant = await withTenantId(phrase);
      await phraseStore.add(phraseWithTenant);
    }

    // Complete
    if (onProgress) {
      onProgress({
        currentStep: 'Data initialization complete!',
        totalSteps: steps.length,
        currentStepIndex: steps.length,
        isComplete: true,
      });
    }

    console.log('[seedInitialData] Initial data seeding completed successfully');
  } catch (error) {
    console.error('[seedInitialData] Error seeding initial data:', error);
    throw error;
  }
}

/**
 * Check if a user already has seeded data
 * This should be called from within a React component with the hook data
 */
export function hasInitialData(
  elementsHydrated: boolean,
  elements: any[],
  sectionsHydrated: boolean,
  sections: any[],
): boolean {
  try {
    // Wait for data to be hydrated
    if (!elementsHydrated || !sectionsHydrated) {
      return false;
    }

    // Check if we have any core data
    return elements.length > 0 || sections.length > 0;
  } catch (error) {
    console.error('[hasInitialData] Error checking for initial data:', error);
    return false;
  }
}

/**
 * Get counts of existing data for display
 */
export async function getDataCounts(): Promise<{
  elements: number;
  components: number;
  phrases: number;
  sections: number;
}> {
  try {
    const [elementsHydrated, elements] = elementStore.useList();
    const [componentsHydrated, components] = componentStore.useList();
    const [phrasesHydrated, phrases] = phraseStore.useList();
    const [sectionsHydrated, sections] = sectionStore.useList();

    return {
      elements: elementsHydrated ? elements.length : 0,
      components: componentsHydrated ? components.length : 0,
      phrases: phrasesHydrated ? phrases.length : 0,
      sections: sectionsHydrated ? sections.length : 0,
    };
  } catch (error) {
    console.error('[getDataCounts] Error getting data counts:', error);
    return {
      elements: 0,
      components: 0,
      phrases: 0,
      sections: 0,
    };
  }
}
