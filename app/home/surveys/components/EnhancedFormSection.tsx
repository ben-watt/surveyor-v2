"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, AlertCircle, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormStatus } from "../building-survey-reports/BuildingSurveyReportSchema";

interface EnhancedFormSectionProps {
  title: string;
  href: string;
  status: FormStatus;
  description?: string;
  className?: string;
}

const SECTION_DESCRIPTIONS = {
  "Report Details": "Basic information about the survey including client details, dates, and property address",
  "Property Description": "Detailed description of the property including construction, age, and key characteristics", 
  "Property Condition": "Inspection findings for each building element including defects and recommendations",
  "Checklist": "Final verification checklist to ensure all critical items have been inspected"
};

export function EnhancedFormSection({ 
  title, 
  href, 
  status, 
  description,
  className = "" 
}: EnhancedFormSectionProps) {
  const router = useRouter();
  
  const sectionDescription = description || SECTION_DESCRIPTIONS[title as keyof typeof SECTION_DESCRIPTIONS];

  const getStatusConfig = (status: FormStatus) => {
    switch (status) {
      case FormStatus.Complete:
        return {
          badge: 'bg-green-100 text-green-800 border-green-200',
          border: 'border-l-green-500',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          text: 'Complete'
        };
      case FormStatus.Error:
        return {
          badge: 'bg-red-100 text-red-800 border-red-200',
          border: 'border-l-red-500',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          text: 'Has Errors'
        };
      case FormStatus.Warning:
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          border: 'border-l-amber-500',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          text: 'Needs Review'
        };
      case FormStatus.Incomplete:
      default:
        return {
          badge: 'bg-gray-100 text-gray-600 border-gray-200',
          border: 'border-l-primary/20 hover:border-l-primary',
          icon: <Clock className="w-5 h-5 text-gray-400" />,
          text: 'Not Started'
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  const handleClick = () => {
    router.push(href);
  };

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${statusConfig.border} ${className}`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {statusConfig.icon}
              <h3 className="font-semibold text-lg truncate">{title}</h3>
              <Badge className={statusConfig.badge} variant="outline">
                {statusConfig.text}
              </Badge>
            </div>
            
            {sectionDescription && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {sectionDescription}
              </p>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {status === FormStatus.Error && (
          <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
            <p className="text-xs text-red-700">
              This section has validation errors that need to be fixed before the survey can be completed.
            </p>
          </div>
        )}

        {status === FormStatus.Warning && (
          <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
            <p className="text-xs text-amber-700">
              This section has warnings that should be reviewed before finalizing the survey.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}