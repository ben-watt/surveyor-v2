"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildingSurveyFormData } from "../building-survey-reports/BuildingSurveyReportSchema";
import { AddressDisplay } from "@/app/home/components/Address/AddressDisplay";
import { CalendarDays, CalendarFold, MapPin, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  formatDateTime,
  formatRelativeTime,
  formatShortDate,
} from "@/app/home/utils/dateFormatters";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getOwnerDisplayName as computeOwnerDisplayName,
  useUserAttributes,
} from "@/app/home/utils/useUser";
import { surveyStore } from "@/app/home/clients/Database";
import { UserAvatar } from "../../components/UserAvatar";

interface SurveyHeaderProps {
  survey: BuildingSurveyFormData;
  isFormValid: boolean;
  onSaveAsDraft: () => void;
  onSave: () => void;
}

export function SurveyHeader({
  survey,
  isFormValid,
  onSaveAsDraft,
  onSave,
}: SurveyHeaderProps) {
  const router = useRouter();
  const [isUserHydrated, user] = useUserAttributes();

  const ownerDisplayName = computeOwnerDisplayName(survey.owner, {
    isUserHydrated,
    currentUser: user,
  });

  const [isRawHydrated, rawList] = surveyStore.useRawList();
  const createdAt = isRawHydrated
    ? rawList.find((s) => s.id === survey.id)?.createdAt
    : undefined;
  const createdAtDate = createdAt ? new Date(createdAt) : undefined;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">Building Survey Report</h1>
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {survey.reportDetails.address.line1 ? (
                  <AddressDisplay
                    address={survey.reportDetails.address}
                    maxLength={60}
                  />
                ) : (
                  <span className="text-amber-600">No address specified</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex items-center gap-2"
                          aria-label="Survey owner"
                        >
                          <UserAvatar
                            name={ownerDisplayName}
                            imageUrl={survey.owner?.signaturePath?.[0]}
                            size="sm"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{ownerDisplayName}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Badge
                  className={`${getStatusColor(survey.status)}`}
                  variant="outline"
                >
                  {survey.status}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-gray-50 text-gray-700 border-gray-200 font-medium"
                >
                  🏢 Level {survey.reportDetails?.level ?? "—"}
                </Badge>
              </div>
              <div className="flex flex-col gap-2">
                {createdAtDate && (
                  <div className="flex items-center gap-2">
                    <CalendarFold className="w-4 h-4" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="underline decoration-dotted"
                            aria-label="Created date"
                          >
                            {formatRelativeTime(createdAtDate)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{`Created: ${formatDateTime(createdAtDate)}`}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {survey.reportDetails.reportDate ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="underline decoration-dotted"
                            aria-label="Report date"
                          >
                            {formatRelativeTime(
                              survey.reportDetails.reportDate
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{`Report Date: ${formatShortDate(survey.reportDetails.reportDate)}`}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-amber-600">No date set</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
                    router.push(
                      `/home/editor/${survey.id}?templateId=building-survey`
                    );
                  }}
                  disabled={!isFormValid}
                >
                  Generate Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveAsDraft}>
                  Save as Draft
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
