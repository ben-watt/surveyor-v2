import {
  BuildingSurveyFormData,
  ElementSection,
  SurveyImage,
  SurveySection,
} from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import BuildingSurveyReport, {
  BuildingSurveyReportTipTap,
  ImageWithMetadata,
} from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportTipTap';
import { renderToStaticMarkup } from 'react-dom/server';
import { getImageHref, getImagesHref } from './image';
import { imageMetadataStore } from '../../clients/Database';

const EmptyImageWithMetadata: ImageWithMetadata = {
  uri: '/placeholder.png',
  hasMetadata: false,
  metadata: null,
  isArchived: false,
};

const imageToImageWithMetadata = async (images: SurveyImage[]): Promise<ImageWithMetadata[]> => {
  return await Promise.all(
    images.map(async (image) => {
      try {
        if (image.hasMetadata) {
          console.debug('[imageToImageWithMetadata] Getting metadata for image', image);
          const metadata = await imageMetadataStore.get(image.path);
          return {
            uri: image.path,
            hasMetadata: !!metadata,
            metadata: metadata,
            isArchived: image.isArchived,
          };
        } else {
          return {
            uri: image.path,
            hasMetadata: false,
            metadata: null,
            isArchived: image.isArchived,
          };
        }
      } catch (error) {
        console.error('[imageToImageWithMetadata] Failed to get image metadata', image.path, error);
        return EmptyImageWithMetadata;
      }
    }),
  );
};

const mapElement = async (elementSection: ElementSection) => {
  console.debug('[mapElement] Processing element section', elementSection);

  const elementImages = await imageToImageWithMetadata(
    elementSection.images.filter((image: SurveyImage) => !image.isArchived),
  );
  console.debug('[mapElement] Mapped element images', elementImages);

  const components = await Promise.all(
    elementSection.components.map(async (component: any) => {
      console.debug('[mapElement] Processing component', component);
      const componentImages = await imageToImageWithMetadata(
        component.images.filter((image: SurveyImage) => !image.isArchived),
      );
      console.debug('[mapElement] Mapped component images', componentImages);
      return {
        ...component,
        images: componentImages,
      };
    }),
  );

  const result = {
    ...elementSection,
    images: elementImages,
    components,
  };

  console.debug('[mapElement] Final element section', result);
  return result;
};

const mapSection = async (section: SurveySection) => {
  console.debug('[mapSection] Processing section', section);

  const elementSections = await Promise.all(section.elementSections.map(mapElement));

  const result = {
    ...section,
    elementSections,
  };

  console.debug('[mapSection] Final section', result);
  return result;
};

export async function mapFormDataToHtml(
  formData: BuildingSurveyFormData | undefined,
): Promise<string> {
  if (!formData) return '';

  try {
    console.debug('[mapFormDataToHtml] Form data', formData);
    const frontElevationImages = await imageToImageWithMetadata(
      formData.reportDetails.frontElevationImagesUri.filter((image) => !image.isArchived),
    );
    const moneyShot = await imageToImageWithMetadata(
      formData.reportDetails.moneyShot.filter((image) => !image.isArchived),
    );

    const form = {
      id: formData.id,
      status: formData.status,
      owner: {
        ...formData.owner,
      },
      reportDetails: {
        ...formData.reportDetails,
        frontElevationImagesUri: frontElevationImages,
        moneyShot: moneyShot,
      },
      propertyDescription: formData.propertyDescription,
      sections: await Promise.all(formData.sections.map(mapSection)),
      checklist: {
        ...formData.checklist,
      },
    } as BuildingSurveyReportTipTap;

    console.debug('[mapFormDataToHtml] Report data', form);

    return renderToStaticMarkup(<BuildingSurveyReport form={form} />);
  } catch (error) {
    console.error('[mapFormDataToHtml] Failed to map form data to HTML', error);
    return '';
  }
}
