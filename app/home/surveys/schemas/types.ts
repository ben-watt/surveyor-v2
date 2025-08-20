import { FormStatus } from '../building-survey-reports/BuildingSurveyReportSchema';

/**
 * Result of computing status for a form section
 */
export interface StatusResult {
  status: FormStatus;
  hasData: boolean;
  isValid: boolean;
  errors?: string[];
}