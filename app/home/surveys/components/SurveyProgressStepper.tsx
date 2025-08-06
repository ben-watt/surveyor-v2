"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, AlertCircle, Clock } from "lucide-react";
import { FormStatus } from "../building-survey-reports/BuildingSurveyReportSchema";

interface FormSection {
  title: string;
  href: string;
  status: FormStatus;
}

interface SurveyProgressStepperProps {
  sections: FormSection[];
  className?: string;
}

export function SurveyProgressStepper({ sections, className = "" }: SurveyProgressStepperProps) {
  const totalSections = sections.length;
  const completedSections = sections.filter(s => s.status === FormStatus.Complete).length;
  const errorSections = sections.filter(s => s.status === FormStatus.Error).length;
  const progress = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  const getStatusIcon = (status: FormStatus, index: number) => {
    switch (status) {
      case FormStatus.Complete:
        return <Check className="w-4 h-4" />;
      case FormStatus.Error:
        return <AlertCircle className="w-4 h-4" />;
      case FormStatus.Warning:
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <span className="text-xs font-medium">{index + 1}</span>;
    }
  };

  const getStatusColor = (status: FormStatus) => {
    switch (status) {
      case FormStatus.Complete:
        return 'bg-green-500 text-white border-green-500';
      case FormStatus.Error:
        return 'bg-red-500 text-white border-red-500';
      case FormStatus.Warning:
        return 'bg-amber-500 text-white border-amber-500';
      case FormStatus.Incomplete:
        return 'bg-gray-200 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-200 text-gray-600 border-gray-200';
    }
  };

  const getProgressColor = () => {
    if (errorSections > 0) return 'bg-red-500';
    if (progress === 100) return 'bg-green-500';
    return 'bg-primary';
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Survey Progress</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {completedSections} of {totalSections} complete
            </Badge>
            {progress === 100 && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Ready to Generate
              </Badge>
            )}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sections.map((section, index) => (
            <div key={section.title} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-colors ${getStatusColor(section.status)}`}>
                {getStatusIcon(section.status, index)}
              </div>
              <span className="text-xs text-center font-medium max-w-20 leading-tight">
                {section.title}
              </span>
              <div className="mt-1">
                {section.status === FormStatus.Complete && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
                {section.status === FormStatus.Error && (
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                )}
                {section.status === FormStatus.Incomplete && (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </div>
            </div>
          ))}
        </div>

        {progress === 100 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Survey Complete!</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              All sections are complete. You can now generate the final report.
            </p>
          </div>
        )}

        {errorSections > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {errorSections} section{errorSections !== 1 ? 's' : ''} need{errorSections === 1 ? 's' : ''} attention
              </span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Please fix the errors in the highlighted sections before generating the report.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}