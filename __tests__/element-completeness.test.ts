import { getElementCompleteness } from '@/app/home/surveys/utils/elementCompleteness';
import type {
  ElementSection,
  SurveyImage,
} from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';

const img = (overrides: Partial<SurveyImage> = {}): SurveyImage => ({
  path: 'p',
  isArchived: false,
  hasMetadata: false,
  ...overrides,
});

const baseElement = (overrides: Partial<ElementSection> = {}): ElementSection => ({
  id: 'e1',
  name: 'Walls',
  isPartOfSurvey: true,
  description: '',
  components: [],
  images: [],
  ...overrides,
});

describe('getElementCompleteness', () => {
  it('handles empty values', () => {
    const res = getElementCompleteness(baseElement());
    expect(res.hasDescription).toBe(false);
    expect(res.hasImages).toBe(false);
    expect(res.imageCount).toBe(0);
    expect(res.hasComponents).toBe(false);
    expect(res.componentCount).toBe(0);
  });

  it('trims description', () => {
    const res = getElementCompleteness(baseElement({ description: '  text  ' }));
    expect(res.hasDescription).toBe(true);
  });

  it('counts only non-archived images', () => {
    const res = getElementCompleteness(baseElement({ images: [img(), img({ isArchived: true })] }));
    expect(res.hasImages).toBe(true);
    expect(res.imageCount).toBe(1);
  });

  it('counts components', () => {
    const res = getElementCompleteness(
      baseElement({
        components: [
          {
            id: 'i1',
            inspectionId: 'i1',
            name: 'Roof',
            conditions: [],
            ragStatus: 'N/I',
            useNameOverride: false,
            nameOverride: '',
            location: '',
            additionalDescription: '',
            images: [],
            costings: [],
          },
        ],
      }),
    );
    expect(res.hasComponents).toBe(true);
    expect(res.componentCount).toBe(1);
  });
});
