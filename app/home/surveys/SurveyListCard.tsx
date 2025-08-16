import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreVertical, Trash2 } from "lucide-react";
import { BuildingSurveyFormData } from "./building-survey-reports/BuildingSurveyReportSchema";
import { useEffect, useState } from "react";
import { imageUploadStore } from "@/app/home/clients/ImageUploadStore";
import ImagePlaceholder from "../components/ImagePlaceholder";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { surveyStore } from "../clients/Database";
import { toast } from "react-hot-toast";
import { useUserAttributes } from "../utils/useUser";
import { formatShortDate } from "../utils/dateFormatters";

interface BuildingSurveyListCardProps {
  survey: BuildingSurveyFormData;
  onView: (id: string) => void;
}

export function BuildingSurveyListCard({
  survey,
  onView,
}: BuildingSurveyListCardProps) {
  const [image, setImage] = useState<string>();
  const [isUserHydrated, user] = useUserAttributes();

  useEffect(() => {
    if (!survey.reportDetails?.moneyShot || survey.reportDetails.moneyShot.length === 0) {
      return;
    }

    imageUploadStore.get(survey.reportDetails.moneyShot[0].path).then((image) => {
      if (image.ok) {
        setImage(image.unwrap().href);
      }
    });
  }, [survey.reportDetails?.moneyShot]);

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

  const imageAlt = survey.reportDetails?.address.formatted
    ? `Survey at ${survey.reportDetails.address.formatted}`
    : "Building survey image";
  const fullTitle = survey.reportDetails?.address.formatted || "Untitled Survey";

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

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-l-green-500";
      case "draft":
        return "border-l-yellow-400";
      case "in-progress":
        return "border-l-blue-500";
      default:
        return "border-l-gray-200";
    }
  };

  const statusBadgeProps = getStatusBadgeProps(survey.status);

  return (
    <Card 
      role="article" 
      aria-labelledby={`survey-title-${survey.id}`} 
      className={`overflow-hidden relative transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-l-4 ${getCardBorderColor(survey.status)} group cursor-pointer`}
    >
      <div className="flex flex-col sm:flex-row h-full">
        <div className="relative w-full sm:w-2/5 min-w-0 sm:min-w-[140px] aspect-[16/9] sm:aspect-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" />
          {image ? (
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 640px) 100vw, 40vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              onError={() => setImage(undefined)}
            />
          ) : (
            <ImagePlaceholder />
          )}
          <Badge
            {...statusBadgeProps}
            className={`absolute top-3 left-3 shadow-sm capitalize ${statusBadgeProps.className}`}
          >
            {survey.status}
          </Badge>
        </div>
        <CardContent className="flex-1 p-5">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 id={`survey-title-${survey.id}`} title={fullTitle} className="font-bold text-xl leading-tight line-clamp-2 flex-1 text-gray-900">
                  {fullTitle}
                </h3>
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
                      onClick={handleDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Survey
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-medium">
                    👤 {survey.owner?.name || "Unknown"}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-medium">
                    📅 {survey.reportDetails?.reportDate
                      ? formatShortDate(survey.reportDetails.reportDate)
                      : "No date set"}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-medium">
                    🏢 Level {survey.reportDetails?.level ?? "—"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {survey.reportDetails?.reportDate ? `Report ${formatShortDate(survey.reportDetails.reportDate)}` : "Draft survey"}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-gray-50 hover:border-gray-300 transition-colors"
                onClick={() => onView(survey.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default BuildingSurveyListCard;
