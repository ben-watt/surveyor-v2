import { BuildingSurveyFormData, ElementSection, SurveyImage, SurveySection } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import BuildingSurveyReport, { BuildingSurveyReportTipTap, ImageWithMetadata } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportTipTap";
import { renderToStaticMarkup } from "react-dom/server";
import { getImageHref, getImagesHref } from "./image";
import { imageMetadataStore } from "../../clients/Database";

const imageToImageWithMetadata = async (images: SurveyImage[]) : Promise<ImageWithMetadata[]> => {
  return await Promise.all(images.map(async image => {
    try {
      const preSignedUrl = await getImageHref(image.path);
      const metadata = await imageMetadataStore.get(image.path);
      return {
        uri: preSignedUrl,
        hasMetadata: !!metadata,
        metadata: metadata ?? null,
        isArchived: image.isArchived,
        path: image.path
      };
    } catch (error) {
      console.error("[imageToImageWithMetadata] Failed to get image metadata", image.path, error);
      
      return {
        uri: "/placeholder.png",
        hasMetadata: false,
        metadata: null,
        isArchived: image.isArchived,
        path: image.path
      };
    }
  }));
};

const mapElement = async (elementSection: ElementSection) => {
  const images = await imageToImageWithMetadata(elementSection.images);
  const components = await Promise.all(
    elementSection.components.map(async (component: any) => ({
      ...component,
      images: await imageToImageWithMetadata(component.images)
    }))
  );
  return {
    ...elementSection,
    images,
    components
  };
};

const mapSection = async (section: SurveySection) => {
  const elementSections = await Promise.all(
    section.elementSections.map(mapElement)
  );
  return {
    ...section,
    elementSections
  };
};

export async function mapFormDataToHtml(
  formData: BuildingSurveyFormData | undefined
): Promise<string> {
  if (!formData) return "";

  try {
    const frontElevationImages = await imageToImageWithMetadata(formData.reportDetails.frontElevationImagesUri);
    const moneyShot = await imageToImageWithMetadata(formData.reportDetails.moneyShot);
    const signaturePath = await getImagesHref(formData.owner.signaturePath ?? []);
    
    const form = {
      ...formData,
      reportDetails: {
        ...formData.reportDetails,
        frontElevationImages,
        moneyShot,
      },
      owner: {
        ...formData.owner,
        signaturePath
      },
      surveySections: await Promise.all(formData.sections.map(mapSection))
    } as BuildingSurveyReportTipTap;

    return renderToStaticMarkup(<BuildingSurveyReport form={form} />);
  } catch (error) {
    console.error("[mapFormDataToHtml] Failed to map form data to HTML", error);
    return "";
  }
} 