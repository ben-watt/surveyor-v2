import { BuildingSurveyFormData } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import BuildingSurveyReport, { BuildingSurveyReportTipTap, ImageWithMetadata } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportTipTap";
import { renderToStaticMarkup } from "react-dom/server";
import { getImageHref, getImagesHref } from "./image";
import { imageMetadataStore } from "../../clients/Database";

const imageToImageWithMetadata = async (imageUris: string[]) : Promise<ImageWithMetadata[]> => {
  return await Promise.all(imageUris.map(async uri => {
    const metadata = await imageMetadataStore.get(uri);
    const preSignedUrl = await getImageHref(uri);
    return {
      uri: preSignedUrl,
      hasMetadata: !!metadata,
      metadata: metadata ?? null
    };
  }));
};

const mapElement = async (elementSection: any) => {
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

const mapSection = async (section: any) => {
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
    const frontElevationImages = await imageToImageWithMetadata(formData.reportDetails.frontElevationImagesUri.map(image => image.path));
    const moneyShot = await imageToImageWithMetadata(formData.reportDetails.moneyShot.map(image => image.path));
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
    console.error("Failed to map form data to HTML:", error);
    return "";
  }
} 