"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildingSurveyFormData, SurveyStatus } from "../building-survey-reports/BuildingSurveyReportSchema";
import { getSurveyStatusBadgeClass, getSurveyStatusLabel, getSurveyStatusShortLabel, SURVEY_STATUSES } from "../utils/status";
import { AddressDisplay } from "@/app/home/components/Address/AddressDisplay";
import { CalendarDays, CalendarFold, MapPin, Check } from "lucide-react";
import {
  formatDateTime,
  formatShortDate,
} from "@/app/home/utils/dateFormatters";
import TimeAgo from "../../components/TimeAgo";
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
}

export function SurveyHeader({
  survey,
}: SurveyHeaderProps) {
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

  const getStatusColor = (status: SurveyStatus) => getSurveyStatusBadgeClass(status);

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge
                      className={`${getStatusColor(survey.status)} cursor-pointer px-2 py-0.5 text-xs whitespace-nowrap`}
                      variant="outline"
                      role="button"
                      aria-label="Survey status"
                      title={getSurveyStatusLabel(survey.status)}
                    >
                      {getSurveyStatusShortLabel(survey.status)}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {SURVEY_STATUSES.map((s) => (
                      <DropdownMenuItem
                        key={s.value}
                        onClick={async () => {
                          await surveyStore.update(survey.id, (draft) => {
                            draft.status = s.value;
                          });
                        }}
                        aria-label={`Set status to ${s.label}`}
                      >
                        <div className="flex items-center gap-2">
                          {survey.status === s.value ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <span className="w-4 h-4" />
                          )}
                          <span>{s.label}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                            <TimeAgo date={createdAtDate} />
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
                            <TimeAgo date={survey.reportDetails.reportDate} />
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

          {/* Actions removed per request; status can be set above */}
        </div>
      </CardContent>
    </Card>
  );
}
