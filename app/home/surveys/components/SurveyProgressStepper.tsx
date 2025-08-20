"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormStatus } from "../building-survey-reports/BuildingSurveyReportSchema";

interface FormSection {
  title: string;
  href: string;
  status?: FormStatus; // Made optional to support reactive status computation
}

interface SurveyProgressStepperProps {
  sections: FormSection[];
  className?: string;
}

/**
 * SurveyProgressStepper renders a compact progress summary with an accessible progress bar
 * and a simplified list of sections with status indicators.
 *
 * @param sections The ordered list of form sections with `title`, `href`, and `status`.
 * @param className Optional class name to customize the outer container.
 * @returns A styled card showing overall progress and per-section statuses.
 */
export function SurveyProgressStepper({ sections, className = '' }: SurveyProgressStepperProps) {
  const totalSections = sections.length;
  const completedSections = sections.filter(s => s.status === FormStatus.Complete).length;
  const errorSections = sections.filter(s => s.status === FormStatus.Error).length;
  const progress = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  const getProgressColor = () => {
    if (errorSections > 0) return 'bg-red-500';
    if (progress === 100) return 'bg-green-500';
    return 'bg-primary';
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Survey progress</h2>
          <div className="flex items-center gap-2">
            {errorSections > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200">{errorSections} issue{errorSections !== 1 ? 's' : ''}</Badge>
            )}
            <Badge variant="outline">{completedSections} / {totalSections}</Badge>
          </div>
        </div>

        <div
          className="w-full bg-muted rounded-md h-2 mb-4 overflow-hidden"
          role="progressbar"
          aria-label="Survey progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-2 rounded-md transition-[width] duration-500 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}