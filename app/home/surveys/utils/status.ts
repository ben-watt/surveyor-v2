import { SurveyStatus } from "../building-survey-reports/BuildingSurveyReportSchema";

export const SURVEY_STATUSES: { value: SurveyStatus; label: string; shortLabel: string }[] = [
  { value: "draft", label: "Draft", shortLabel: "Draft" },
  { value: "ready_for_survey", label: "Ready for Survey", shortLabel: "Ready" },
  { value: "pending_approval", label: "Pending Approval", shortLabel: "Pending" },
  { value: "approved", label: "Approved", shortLabel: "Approved" },
  { value: "sent_to_client", label: "Sent to Client", shortLabel: "Sent" },
  { value: "completed", label: "Completed", shortLabel: "Completed" },
  { value: "archived", label: "Archived", shortLabel: "Archived" },
];

export function getSurveyStatusLabel(status: SurveyStatus): string {
  return SURVEY_STATUSES.find(s => s.value === status)?.label || status;
}

export function getSurveyStatusShortLabel(status: SurveyStatus): string {
  return SURVEY_STATUSES.find(s => s.value === status)?.shortLabel || status;
}

export function getSurveyStatusBadgeClass(status: SurveyStatus): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "draft":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "ready_for_survey":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "pending_approval":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "sent_to_client":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "archived":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}


