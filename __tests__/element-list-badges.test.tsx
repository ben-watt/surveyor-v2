import React from 'react';
import { render, screen } from '@testing-library/react';
import { ElementSectionComponent } from '@/app/home/surveys/[id]/condition/ElementSectionComponent';
import type { ElementSection } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';

// Mock drawer context usage
jest.mock('@/app/home/components/Drawer', () => ({
  useDynamicDrawer: () => ({ openDrawer: jest.fn() }),
}));

// Mock surveyStore hook used inside the component
jest.mock('@/app/home/clients/Database', () => ({
  surveyStore: {
    useGet: () => [true, {}],
    update: jest.fn(),
  },
}));

const mkElement = (overrides: Partial<ElementSection> = {}): ElementSection => ({
  id: 'e1',
  name: 'Walls',
  isPartOfSurvey: true,
  description: '',
  components: [],
  images: [],
  ...overrides,
});

describe('ElementSection badges', () => {
  it('shows missing description, no images, and 0 components', () => {
    render(<ElementSectionComponent elementSection={mkElement()} sectionId="s1" surveyId="sv1" />);
    expect(screen.getByRole('status', { name: /description missing/i })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /no images added/i })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /0 components/i })).toBeInTheDocument();
  });

  it('shows present description, image and component counts', () => {
    render(
      <ElementSectionComponent
        elementSection={mkElement({
          description: 'Text',
          images: [{ path: 'a', isArchived: false, hasMetadata: false }],
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
        })}
        sectionId="s1"
        surveyId="sv1"
      />,
    );
    expect(screen.getByRole('status', { name: /description present/i })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /1 image/i })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /1 component/i })).toBeInTheDocument();
  });
});
