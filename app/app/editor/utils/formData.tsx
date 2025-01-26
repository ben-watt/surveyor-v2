import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import BuildingSurveyReport from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportTipTap";
import { renderToStaticMarkup } from "react-dom/server";
import { getImagesHref } from "./image";

export async function mapFormDataToHtml(
  formData: BuildingSurveyFormData | undefined
): Promise<string> {
  if (!formData) return "";

  try {
    const newFormData = { ...formData };

    const [frontElevationImages, moneyShot, signaturePath] = await Promise.all([
      getImagesHref(formData.reportDetails.frontElevationImagesUri ?? []),
      getImagesHref(formData.reportDetails.moneyShot ?? []),
      getImagesHref(formData.owner.signaturePath ?? []),
    ]);

    newFormData.reportDetails.frontElevationImagesUri = frontElevationImages;
    newFormData.reportDetails.moneyShot = moneyShot;
    newFormData.owner.signaturePath = signaturePath;

    const sectionImageTasks = formData.sections.map(async (section, si) => {
      const elementSectionTasks = section.elementSections.map(async (es, i) => {
        const preSignedUrl = await getImagesHref(es.images ?? []);
        newFormData.sections[si].elementSections[i].images = preSignedUrl;
      });
      await Promise.all(elementSectionTasks);
    });

    await Promise.all(sectionImageTasks);

    return renderToStaticMarkup(<BuildingSurveyReport form={newFormData} />);
  } catch (error) {
    console.error("Failed to map form data to HTML:", error);
    return "";
  }
} 