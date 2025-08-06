"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BuildingSurveyFormData } from "../building-survey-reports/BuildingSurveyReportSchema";
import { AddressDisplay } from "@/app/home/components/Address/AddressDisplay";
import { CalendarDays, MapPin, User, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatShortDate } from "@/app/home/utils/dateFormatters";

interface SurveyHeaderProps {
  survey: BuildingSurveyFormData;
  isFormValid: boolean;
  onSaveAsDraft: () => void;
  onSave: () => void;
}

export function SurveyHeader({ survey, isFormValid, onSaveAsDraft, onSave }: SurveyHeaderProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">
                Building Survey Report - Level {survey.reportDetails.level}
              </h1>
              <Badge className={getStatusColor(survey.status)} variant="outline">
                {survey.status}
              </Badge>
            </div>
            
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {survey.reportDetails.address.line1 ? (
                  <AddressDisplay address={survey.reportDetails.address} maxLength={60} />
                ) : (
                  <span className="text-amber-600">No address specified</span>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{survey.owner?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    {survey.reportDetails.reportDate 
                      ? formatShortDate(survey.reportDetails.reportDate)
                      : 'No date set'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onSaveAsDraft}>
              Save as Draft
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Zap className="w-4 h-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(ev) => {
                    ev.preventDefault();
                    router.push(`/home/editor/${survey.id}?templateId=building-survey`);
                  }}
                  disabled={!isFormValid}
                >
                  Generate Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSave} disabled={!isFormValid}>
                  Save & Complete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}