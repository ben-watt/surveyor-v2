import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageIcon, MoreVertical, Trash2 } from "lucide-react";
import { BuildingSurveyFormData } from "./building-survey-reports/BuildingSurveyReportSchema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { surveyStore } from "../clients/Database";
import { toast } from "react-hot-toast";
import { useUserAttributes } from "../utils/useUser";
import { formatRelativeTime } from "../utils/dateFormatters";
import { getOwnerDisplayName as computeOwnerDisplayName } from "../utils/useUser";
import { UserAvatar } from "../components/UserAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAllSurveyImages } from "./building-survey-reports/Survey";
import { computeSurveyProgress } from "./utils/progress";

interface BuildingSurveyListCardProps {
  survey: BuildingSurveyFormData;
  onView: (id: string) => void;
}

export function BuildingSurveyListCard({
  survey,
  onView,
}: BuildingSurveyListCardProps) {
  const [isUserHydrated, user] = useUserAttributes();

  const handleDelete = async () => {
    try {
      if (!isUserHydrated || !user) {
        toast.error("You are not authorized to delete this survey");
        return;
      }

      if (user.sub !== survey.owner?.id) {
        toast.error("You are not authorized to delete this survey");
        return;
      }

      await surveyStore.remove(survey.id);
    } catch (error) {
      toast.error("Failed to delete survey, please try again later");
    }
  };

  const isDraft = survey.status === "draft";
  const fullTitle = survey.reportDetails?.address.formatted || "New survey";
  const title = fullTitle.length > 80 ? `${fullTitle.slice(0, 80)}…` : fullTitle;

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case "completed":
        return { variant: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white" };
      case "draft":
        return { variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
      case "in-progress":
        return { variant: "default" as const, className: "bg-blue-500 hover:bg-blue-600 text-white" };
      default:
        return { variant: "secondary" as const, className: "" };
    }
  };

  const statusBadgeProps = getStatusBadgeProps(survey.status);
  
  const ownerDisplayName = computeOwnerDisplayName(survey.owner, {
    isUserHydrated,
    currentUser: user,
  });

  // Get createdAt from raw dexie list for this survey id (lightweight, memoized by hook)
  const [isRawHydrated, rawList] = surveyStore.useRawList();
  const createdAt = isRawHydrated
    ? rawList.find((s) => s.id === survey.id)?.createdAt
    : undefined;
  const createdAtDate = createdAt ? new Date(createdAt) : undefined;

  // Compute a total image count using helper
  const imageCount = getAllSurveyImages(survey).filter(i => !i.isArchived).length;

  // Compute compact progress (always compute; render only for drafts)
  const { progressPercent, completedSections, totalSections } = useMemo(
    () => computeSurveyProgress(survey),
    [survey]
  );

  return (
    <Card 
      role="button"
      tabIndex={0}
      aria-labelledby={`survey-title-${survey.id}`} 
      onClick={() => onView(survey.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(survey.id);
        }
      }}
      className={`overflow-hidden relative transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group cursor-pointer`}
    >
      <div className="flex flex-col h-full">
        <CardContent className="flex-1 p-3">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    {...statusBadgeProps}
                    className={`shrink-0 capitalize ${statusBadgeProps.className}`}
                  >
                    {survey.status}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-medium">
                    🏢 Level {survey.reportDetails?.level ?? "—"}
                  </Badge>

                </div>
                {isUserHydrated && user && user.sub === survey.owner?.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="Open survey actions menu"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-100 opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (confirm("Delete this survey? This cannot be undone.")) {
                          void handleDelete();
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Survey
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>
              <h3 id={`survey-title-${survey.id}`} title={fullTitle} className="font-bold text-xl leading-tight truncate flex-1 text-gray-900">
                  {title}
                  </h3> 


              <div className="space-y-3 mt-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <UserAvatar name={ownerDisplayName} imageUrl={survey.owner?.signaturePath?.[0]} size="sm" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{ownerDisplayName}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {isDraft && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-full bg-muted rounded h-1.5 overflow-hidden" aria-hidden>
                      <div className={`h-1.5 ${progressPercent === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 text-nowrap">{completedSections} / {totalSections}</div>
                  </div>
                )}

              

              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {createdAtDate ? `Created ${formatRelativeTime(createdAtDate)}` : (isDraft ? "Draft" : "")}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1" aria-hidden>
                <ImageIcon className="w-4 h-4" />
                <span> {imageCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default BuildingSurveyListCard;
