import {
  FormStatus,
  type BuildingSurveyFormData,
} from '../building-survey-reports/BuildingSurveyReportSchema';
import { zodSectionStatusMap } from '../schemas';

export const FORM_SECTION_TITLES = [
  'Report Details',
  'Property Description',
  'Property Condition',
  'Checklist',
] as const;

export type FormSectionTitle = (typeof FORM_SECTION_TITLES)[number];

type StatusResult = ReturnType<(typeof zodSectionStatusMap)[FormSectionTitle]>;

export type SectionStatuses = Record<FormSectionTitle, StatusResult>;

export function getSectionStatusesFromSurvey(survey: BuildingSurveyFormData): SectionStatuses {
  return {
    'Report Details': zodSectionStatusMap['Report Details'](survey.reportDetails),
    'Property Description': zodSectionStatusMap['Property Description'](survey.propertyDescription),
    'Property Condition': zodSectionStatusMap['Property Condition'](survey.sections),
    Checklist: zodSectionStatusMap['Checklist'](survey.checklist),
  } as const;
}

export function computeSurveyProgressFromStatuses(statuses: SectionStatuses) {
  const totalSections = FORM_SECTION_TITLES.length;
  const completedSections = FORM_SECTION_TITLES.filter(
    (k) => statuses[k].status === FormStatus.Complete,
  ).length;
  const errorSections = FORM_SECTION_TITLES.filter(
    (k) => statuses[k].status === FormStatus.Error,
  ).length;
  const progressPercent =
    totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return { completedSections, totalSections, progressPercent, errorSections } as const;
}

export function computeSurveyProgress(survey: BuildingSurveyFormData) {
  const statuses = getSectionStatusesFromSurvey(survey);
  return computeSurveyProgressFromStatuses(statuses);
}
