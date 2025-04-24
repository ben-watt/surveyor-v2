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

interface BuildingSurveyListCardProps {
  survey: BuildingSurveyFormData;
  onView: (id: string) => void;
}

export function BuildingSurveyListCard({
  survey,
  onView,
}: BuildingSurveyListCardProps) {
  const [image, setImage] = useState<string>();

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
      await surveyStore.remove(survey.id);
    } catch (error) {
      console.error("Failed to delete survey:", error);
    }
  };

  if (!survey) {
    return null;
  }

  return (
    <Card className="overflow-hidden relative">
      <div className="flex h-full">
        <div className="relative w-1/3 min-w-[120px]">
          {image ? (
            <Image
              src={image}
              alt={"Building survey image"}
              layout="fill"
              objectFit="cover"
            />
          ) : (
            <ImagePlaceholder />
          )}
          <Badge
            variant={survey.status === "draft" ? "secondary" : "default"}
            className="absolute top-2 left-2"
          >
            {survey.status}
          </Badge>
        </div>
        <CardContent className="flex-1 p-4">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-start gap-2">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1 flex-1">
                  {survey.reportDetails?.address.formatted || "Untitled Survey"}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mt-1 h-8 w-8"
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

              <div className="text-sm flex flex-wrap items-center gap-4">
                <Badge variant="secondary">
                  {survey.owner?.name || "Unknown"}
                </Badge>
                <Badge variant="secondary">
                  {survey.reportDetails?.reportDate
                    ? new Date(
                        survey.reportDetails.reportDate
                      ).toLocaleDateString()
                    : "No date set"}
                </Badge>
                <Badge variant="secondary">
                  Level {survey.reportDetails.level}
                </Badge>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full sm:w-auto"
              onClick={() => onView(survey.id)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default BuildingSurveyListCard;
