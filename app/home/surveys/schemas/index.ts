// New metadata-based status approach - eliminates need for runtime validation

import { 
  reportDetailsFieldsSchema,
} from './reportDetails';
import { 
  propertyDescriptionFieldsSchema,
} from './propertyDescription';
import { 
  checklistSchema,
  checklistFieldsSchema,
} from './checklist';
import { getFormStatus, updateFormMeta } from './formMeta';
import type { StatusResult } from './types';
import { FormStatus } from '../building-survey-reports/BuildingSurveyReportSchema';

// Export all schemas for use in forms
export * from './reportDetails';
export * from './propertyDescription';  
export * from './checklist';
export * from './formMeta';

// Hybrid status functions - use metadata if available, fallback to validation
export const zodReportDetailsStatus = (data: unknown): StatusResult => {
  const formData = data as any;
  
  // If metadata exists, use it (new approach)
  if (formData?._meta) {
    return getFormStatus(formData);
  }
  
  // Fallback to old validation approach for backward compatibility
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return { status: FormStatus.Incomplete, hasData: false, isValid: false, errors: [] };
  }

  const validationResult = reportDetailsFieldsSchema.safeParse(data);
  return {
    status: validationResult.success ? FormStatus.Complete : FormStatus.InProgress,
    hasData: true,
    isValid: validationResult.success,
    errors: validationResult.success ? [] : validationResult.error?.issues.map(e => 
      `${e.path.map(p => String(p)).join('.')}: ${e.message}`
    ) || []
  };
};

export const zodPropertyDescriptionStatus = (data: unknown): StatusResult => {
  const formData = data as any;
  
  // If metadata exists, use it (new approach)
  if (formData?._meta) {
    return getFormStatus(formData);
  }
  
  // Fallback to old validation approach for backward compatibility
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return { status: FormStatus.Incomplete, hasData: false, isValid: false, errors: [] };
  }

  const validationResult = propertyDescriptionFieldsSchema.safeParse(data);
  return {
    status: validationResult.success ? FormStatus.Complete : FormStatus.InProgress,
    hasData: true,
    isValid: validationResult.success,
    errors: validationResult.success ? [] : validationResult.error?.issues.map(e => 
      `${e.path.map(p => String(p)).join('.')}: ${e.message}`
    ) || []
  };
};

export const zodChecklistStatus = (data: unknown): StatusResult => {
  const formData = data as any;
  
  // If metadata exists, use it (new approach)
  if (formData?._meta) {
    return getFormStatus(formData);
  }
  
  // Fallback to old validation approach for backward compatibility
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return { status: FormStatus.Incomplete, hasData: false, isValid: false, errors: [] };
  }

  const validationResult = checklistSchema.safeParse(data);
  return {
    status: validationResult.success ? FormStatus.Complete : FormStatus.InProgress,
    hasData: true,
    isValid: validationResult.success,
    errors: validationResult.success ? [] : validationResult.error?.issues.map(e => 
      `${e.path.map(p => String(p)).join('.')}: ${e.message}`
    ) || []
  };
};

// Helper functions to update form metadata when saving
export const updateReportDetailsStatus = (data: unknown) => {
  const validationResult = reportDetailsFieldsSchema.safeParse(data);
  return updateFormMeta(data, validationResult);
};

export const updatePropertyDescriptionStatus = (data: unknown) => {
  const validationResult = propertyDescriptionFieldsSchema.safeParse(data);
  return updateFormMeta(data, validationResult);
};

export const updateChecklistStatus = (data: unknown) => {
  const validationResult = checklistFieldsSchema.safeParse(data);
  return updateFormMeta(data, validationResult);
};

// Backward compatibility - property condition status (can be enhanced later)
export const zodPropertyConditionStatus = (data: unknown): StatusResult => {
  const sections = Array.isArray(data) ? data : [];
  const isComplete = sections.every((section: any) => 
    section.elementSections?.every((element: any) => 
      !element.isPartOfSurvey || (
      element.description &&
      (element.images && element.images.length > 0) &&
      (element.components && element.components.length > 0))
    )
  );
  
  return {
    status: isComplete ? FormStatus.Complete : FormStatus.InProgress,
    hasData: true,
    isValid: isComplete,
    errors: []
  };
};

// Centralized section status mapping - now uses instant metadata lookup
export const zodSectionStatusMap = {
  'Report Details': zodReportDetailsStatus,
  'Property Description': zodPropertyDescriptionStatus,
  'Property Condition': zodPropertyConditionStatus,
  'Checklist': zodChecklistStatus
} as const;