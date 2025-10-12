import { SurveyStatus } from '../building-survey-reports/BuildingSurveyReportSchema';

export const SURVEY_STATUSES: { value: SurveyStatus; label: string; shortLabel: string }[] = [
  { value: 'draft', label: 'Draft', shortLabel: 'Draft' },
  { value: 'ready_for_qa', label: 'Ready for QA', shortLabel: 'QA' },
  { value: 'issued_to_client', label: 'Issued to Client', shortLabel: 'Issued' },
  { value: 'archived', label: 'Archived', shortLabel: 'Archived' },
];

export function getSurveyStatusLabel(status: SurveyStatus): string {
  return SURVEY_STATUSES.find((s) => s.value === status)?.label || status;
}

export function getSurveyStatusShortLabel(status: SurveyStatus): string {
  return SURVEY_STATUSES.find((s) => s.value === status)?.shortLabel || status;
}

export function getSurveyStatusBadgeClass(status: SurveyStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'ready_for_qa':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'issued_to_client':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'archived':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
