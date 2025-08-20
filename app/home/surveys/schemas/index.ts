// Clean, Zod-based status computers that eliminate validation duplication

import { 
  reportDetailsSchema, 
} from './reportDetails';
import { 
  propertyDescriptionSchema,
} from './propertyDescription';
import { 
  checklistSchema,
} from './checklist';
import { 
  memoizeZodStatusComputer 
} from './zodStatusComputer';
import type { StatusResult } from './types';
import { FormStatus } from '../building-survey-reports/BuildingSurveyReportSchema';

// Export all schemas for use in forms
export * from './reportDetails';
export * from './propertyDescription';  
export * from './checklist';
export * from './zodStatusComputer';

// Create memoized status computers using simple presence-aware approach
export const zodReportDetailsStatus = memoizeZodStatusComputer(
  (data: unknown) => {
    // No data means not started  
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { status: FormStatus.Incomplete, hasData: false, isValid: false, errors: [] };
    }

    // Has data, check if it meets requirements for completion
    const validationResult = reportDetailsSchema.safeParse(data);
    return {
      status: validationResult.success ? FormStatus.Complete : FormStatus.InProgress,
      hasData: true,
      isValid: validationResult.success,
      errors: validationResult.success ? [] : validationResult.error?.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ) || []
    };
  }
);

export const zodPropertyDescriptionStatus = memoizeZodStatusComputer(
  (data: unknown) => {
    // No data means not started
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { status: FormStatus.Incomplete, hasData: false, isValid: false, errors: [] };
    }

    // Has data, check if it meets requirements for completion
    const validationResult = propertyDescriptionSchema.safeParse(data);
    return {
      status: validationResult.success ? FormStatus.Complete : FormStatus.InProgress,
      hasData: true,
      isValid: validationResult.success,
      errors: validationResult.success ? [] : validationResult.error?.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ) || []
    };
  }
);

export const zodChecklistStatus = memoizeZodStatusComputer(
  (data: unknown) => {
    // No data means not started
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { status: FormStatus.Incomplete, hasData: false, isValid: false, errors: [] };
    }

    // Has data, check if it meets requirements for completion
    const validationResult = checklistSchema.safeParse(data);
    return {
      status: validationResult.success ? FormStatus.Complete : FormStatus.InProgress,
      hasData: true,
      isValid: validationResult.success,
      errors: validationResult.success ? [] : validationResult.error?.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ) || []
    };
  }
);

// Simple placeholder for property condition (can be enhanced later)
export const zodPropertyConditionStatus = memoizeZodStatusComputer(
  (data: unknown): StatusResult => {
    const sections = Array.isArray(data) ? data : [];
    const hasData = sections.some((section: any) => 
      section.elementSections?.some((element: any) => 
        element.description || 
        (element.images && element.images.length > 0) ||
        (element.components && element.components.length > 0)
      )
    );
    
    return {
      status: hasData ? 'in-progress' as any : 'incomplete' as any,
      hasData,
      isValid: false, // For now, never consider complete
      errors: []
    };
  }
);

// Centralized section status mapping using Zod
export const zodSectionStatusMap = {
  'Report Details': zodReportDetailsStatus,
  'Property Description': zodPropertyDescriptionStatus,
  'Property Condition': zodPropertyConditionStatus,
  'Checklist': zodChecklistStatus
} as const;