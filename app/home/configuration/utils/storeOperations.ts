import { sectionStore, elementStore, componentStore } from '../../clients/Database';
import { getCurrentTenantId } from '../../utils/tenant-utils';
import { Result, Ok, Err } from 'ts-results';

export async function updateSectionOrder(sectionId: string, order: number): Promise<Result<void, Error>> {
  try {
    // Use get method to find section
    const existingItem = await sectionStore.get(sectionId);
    if (!existingItem) {
      return Err(new Error(`Section ${sectionId} not found`));
    }

    // Update with new order using immer-style function
    await sectionStore.update(sectionId, (draft) => {
      (draft as any).order = order;
    });

    return Ok(undefined);
  } catch (error) {
    return Err(error as Error);
  }
}

export async function updateElementOrder(elementId: string, order: number, sectionId?: string): Promise<Result<void, Error>> {
  try {
    // Use get method to find element
    const existingItem = await elementStore.get(elementId);
    if (!existingItem) {
      return Err(new Error(`Element ${elementId} not found`));
    }

    // Update with new order and optionally new section using immer-style function
    await elementStore.update(elementId, (draft) => {
      (draft as any).order = order;
      if (sectionId) {
        (draft as any).sectionId = sectionId;
      }
    });

    return Ok(undefined);
  } catch (error) {
    return Err(error as Error);
  }
}

export async function updateComponentOrder(componentId: string, order: number, elementId?: string): Promise<Result<void, Error>> {
  try {
    // Use get method to find component
    const existingItem = await componentStore.get(componentId);
    if (!existingItem) {
      return Err(new Error(`Component ${componentId} not found`));
    }

    // Update with new order and optionally new element using immer-style function
    await componentStore.update(componentId, (draft) => {
      (draft as any).order = order;
      if (elementId) {
        (draft as any).elementId = elementId;
      }
    });

    return Ok(undefined);
  } catch (error) {
    return Err(error as Error);
  }
}

export async function batchUpdateOrders(
  updates: Array<{ id: string; order: number; type: 'section' | 'element' | 'component' }>
): Promise<Result<void, Error>> {
  try {
    const errors: Error[] = [];
    
    for (const update of updates) {
      let result: Result<void, Error>;
      
      switch (update.type) {
        case 'section':
          result = await updateSectionOrder(update.id, update.order);
          break;
        case 'element':
          result = await updateElementOrder(update.id, update.order);
          break;
        case 'component':
          result = await updateComponentOrder(update.id, update.order);
          break;
        default:
          result = Err(new Error(`Unknown entity type: ${update.type}`));
      }
      
      if (result.err) {
        errors.push(result.val);
      }
    }
    
    if (errors.length > 0) {
      return Err(new Error(`Failed to update ${errors.length} items: ${errors.map(e => e.message).join(', ')}`));
    }
    
    return Ok(undefined);
  } catch (error) {
    return Err(error as Error);
  }
}