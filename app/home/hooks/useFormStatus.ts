import { FormStatus } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';

export interface FormStatusConfig {
  isValid: boolean;
  hasExistingData: boolean;
}

/**
 * Shared utility to determine form status based on validation and existing data
 * 
 * @param config Object containing validation state and existing data flag
 * @returns FormStatus enum value
 */
export function determineFormStatus({ isValid, hasExistingData }: FormStatusConfig): FormStatus {
  if (isValid) {
    return FormStatus.Complete;
  } else if (hasExistingData) {
    return FormStatus.InProgress; // Show as "Incomplete" when previously saved data exists
  } else {
    return FormStatus.Incomplete; // Show as "Not Started" when no previous data
  }
}

/**
 * Helper function to determine if checklist has existing data
 * 
 * @param items Array of checklist items
 * @returns boolean indicating if any items are checked
 */
export function hasChecklistData(items: Array<{ value?: boolean }>): boolean {
  return items.some(item => item.value === true);
}

/**
 * Helper function to determine if property description has existing data
 * 
 * @param data Property description data object
 * @returns boolean indicating if any fields have values
 */
export function hasPropertyDescriptionData(data: Record<string, { value: string }>): boolean {
  return Object.values(data).some(field => field.value?.trim());
}

/**
 * Helper function to determine if element has existing data
 * 
 * @param description Element description string
 * @param images Array of images
 * @returns boolean indicating if element has data
 */
export function hasElementData(description?: string, images?: Array<any>): boolean {
  return !!(description?.trim() || (images && images.length > 0));
}

/**
 * Helper function to determine if inspection has existing data
 * 
 * @param data Inspection form data
 * @returns boolean indicating if inspection has data
 */
export function hasInspectionData(data: {
  location?: string;
  nameOverride?: string;
  additionalDescription?: string;
  ragStatus?: string;
  images?: Array<any>;
  conditions?: Array<any>;
  costings?: Array<any>;
}): boolean {
  return !!(
    data.location?.trim() ||
    data.nameOverride?.trim() ||
    data.additionalDescription?.trim() ||
    (data.ragStatus && data.ragStatus !== "N/I") ||
    (data.images && data.images.length > 0) ||
    (data.conditions && data.conditions.length > 0) ||
    (data.costings && data.costings.length > 0)
  );
}

/**
 * Helper function to determine if report details has existing data
 * 
 * @param data Report details data
 * @returns boolean indicating if report details has data
 */
export function hasReportDetailsData(data: {
  clientName?: string;
  reference?: string;
  weather?: string;
  orientation?: string;
  situation?: string;
  address?: any; // Can be string or Address object
  level?: string;
  inspectionDate?: string | Date;
  reportDate?: string | Date;
  moneyShot?: Array<any>;
  frontElevationImagesUri?: Array<any>;
}): boolean {
  const addressValue = typeof data.address === 'string' ? data.address : data.address?.formatted_address;
  
  return !!(
    data.clientName ||
    data.reference ||
    data.weather ||
    data.orientation ||
    data.situation ||
    addressValue ||
    data.level ||
    data.inspectionDate ||
    data.reportDate ||
    (data.moneyShot && data.moneyShot.length > 0) ||
    (data.frontElevationImagesUri && data.frontElevationImagesUri.length > 0)
  );
}