import {
  ElementSection,
  SurveyImage,
} from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';

export type ElementCompleteness = {
  hasDescription: boolean;
  hasImages: boolean;
  imageCount: number;
  hasComponents: boolean;
  componentCount: number;
};

function countNonArchived(images: SurveyImage[] | undefined): number {
  return (images || []).filter((img) => !img.isArchived).length;
}

export function getElementCompleteness(element: ElementSection): ElementCompleteness {
  const description = (element.description || '').trim();
  const imageCount = countNonArchived(element.images);
  const componentCount = (element.components || []).length;

  return {
    hasDescription: description.length > 0,
    hasImages: imageCount > 0,
    imageCount,
    hasComponents: componentCount > 0,
    componentCount,
  };
}
