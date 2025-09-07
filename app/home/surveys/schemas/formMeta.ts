import { z } from 'zod';
import { FormStatus } from '../building-survey-reports/BuildingSurveyReportSchema';

/**
 * Generic form metadata schema for tracking form status
 * This eliminates the need for runtime validation to determine status
 */
export const formMetaSchema = z.object({
  status: z.nativeEnum(FormStatus),
  isValid: z.boolean(),
  hasData: z.boolean(),
  errors: z.array(z.string()).default([]),
  lastValidated: z.coerce.date().optional(),
  lastModified: z.coerce.date().optional(),
});

export type FormMeta = z.infer<typeof formMetaSchema>;

/**
 * Creates initial form metadata for a new form
 */
export function createInitialFormMeta(): FormMeta {
  return {
    status: FormStatus.Incomplete,
    isValid: false,
    hasData: false,
    errors: [],
    lastValidated: new Date(),
    lastModified: new Date(),
  };
}

/**
 * Updates form metadata based on current form data and validation result
 */
export function updateFormMeta(
  currentData: unknown,
  validationResult: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } },
  previousMeta?: FormMeta
): FormMeta {
  const hasData = currentData && 
    typeof currentData === 'object' && 
    Object.keys(currentData).length > 0;

  const errors = validationResult.success 
    ? [] 
    : (validationResult.error?.issues.map(issue => 
        `${issue.path.map(p => String(p)).join('.')}: ${issue.message}`
      ) || []);

  let status: FormStatus;
  if (!hasData) {
    status = FormStatus.Incomplete;
  } else if (validationResult.success) {
    status = FormStatus.Complete;
  } else {
    status = FormStatus.InProgress;
  }

  return {
    status,
    isValid: validationResult.success,
    hasData: Boolean(hasData),
    errors,
    lastValidated: new Date(),
    lastModified: new Date(),
  };
}

/**
 * Quick status lookup without validation - just reads stored metadata
 */
export function getFormStatus(formData: { _meta?: FormMeta }): {
  status: FormStatus;
  isValid: boolean;
  hasData: boolean;
  errors: string[];
} {
  const meta = formData._meta || createInitialFormMeta();
  
  return {
    status: meta.status,
    isValid: meta.isValid,
    hasData: meta.hasData,
    errors: meta.errors,
  };
}