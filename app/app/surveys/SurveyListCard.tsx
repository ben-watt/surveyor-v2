import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { BuildingSurveyFormData } from "./building-survey-reports/BuildingSurveyReportSchema"
import { useEffect, useState } from "react"
import { imageUploadStore } from "@/app/app/clients/ImageUploadStore"

interface BuildingSurveyListCardProps {
  survey: BuildingSurveyFormData
  onView: (id: string) => void
}

export function BuildingSurveyListCard({ survey, onView }: BuildingSurveyListCardProps) {
    const [image, setImage] = useState<string>("/next.svg")

    useEffect(() => {
        imageUploadStore.get(survey.reportDetails?.moneyShot[0])
        .then((image) => {
            if(image.ok) {
                setImage(image.val.href)
            }
        })
    }, [survey.reportDetails?.moneyShot])


    if (!survey) {
        return null
    }

  return (
    <Card className="overflow-hidden">
      <div className="flex h-full">
        <div className="relative w-1/3 min-w-[120px]">
          <Image
            src={image}
            alt={"Building survey image"}
            layout="fill"
            objectFit="cover"
          />
          <Badge variant={survey.status === "draft" ? "secondary" : "default"} className="absolute top-2 left-2">
            {survey.status}
          </Badge>
        </div>
        <CardContent className="flex-1 p-4">
          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                {survey.reportDetails?.address.formatted || "Untitled Survey"}
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground line-clamp-1">
                  {survey.reportDetails?.address.formatted || "Address not provided"}
                </p>
                <p className="text-muted-foreground">{survey.sections?.length || 0} sections</p>
                <Badge variant="secondary">{survey.owner?.name || "Unknown"}</Badge>
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={() => onView(survey.id)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

export default BuildingSurveyListCard;
