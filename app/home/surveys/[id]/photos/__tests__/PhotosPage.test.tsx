import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/image to a regular img to avoid Next.js specific behavior in tests
// eslint-disable-next-line react/display-name
jest.mock('next/image', () => (props: any) => {
  return <img {...props} />;
});

// Mock router/params
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'survey-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

// Mock enhanced image store to return synthetic images
jest.mock('@/app/home/clients/enhancedImageMetadataStore', () => ({
  enhancedImageStore: {
    getActiveImages: jest.fn().mockResolvedValue({ ok: true, val: [
      { id: 'img1', imagePath: 'report-images/survey-1/elements/e1/a.jpg', thumbnailDataUrl: 'data:image/jpeg;base64,AAA', isArchived: false, fileName: 'a.jpg' },
      { id: 'img2', imagePath: 'report-images/survey-1/inspections/insp-1/b.jpg', thumbnailDataUrl: 'data:image/jpeg;base64,AAA', isArchived: false, fileName: 'b.jpg' },
      { id: 'img3', imagePath: 'report-images/survey-1/money-shot/cover.jpg', thumbnailDataUrl: 'data:image/jpeg;base64,AAA', isArchived: false, fileName: 'cover.jpg' },
    ]}),
    getArchivedImages: jest.fn().mockResolvedValue({ ok: true, val: [
      { id: 'img4', imagePath: 'report-images/survey-1/front-elevation/front.jpg', thumbnailDataUrl: 'data:image/jpeg;base64,AAA', isArchived: true, fileName: 'front.jpg' },
    ]}),
  },
}));

// Mock stores: survey, elements, sections
jest.mock('@/app/home/clients/Database', () => ({
  surveyStore: {
    useGet: (id: string) => [true, {
      id,
      sections: [
        {
          id: 'sec-1',
          name: 'Exterior',
          elementSections: [
            {
              id: 'e1',
              name: 'Roof',
              isPartOfSurvey: true,
              description: '',
              images: [],
              components: [
                { id: 'comp-1', inspectionId: 'insp-1', name: 'Gutters', nameOverride: 'Gutters', useNameOverride: false, location: '', additionalDescription: '', images: [], conditions: [], ragStatus: 'N/I', costings: [] }
              ],
            }
          ],
        }
      ],
      reportDetails: {},
    }],
  },
  elementStore: {
    useList: () => [true, [
      { id: 'e1', name: 'Roof', order: 0, sectionId: 'sec-1', description: '', createdAt: '', updatedAt: '', syncStatus: 'synced', tenantId: 't1' },
    ]],
  },
  sectionStore: {
    useList: () => [true, [
      { id: 'sec-1', name: 'Exterior', order: 0, createdAt: '', updatedAt: '', syncStatus: 'synced', tenantId: 't1' },
    ]],
  }
}));

// Import after mocks
import PhotosPage from '../page';

describe('PhotosPage grouping and naming', () => {
  it('groups element images by SectionName / ElementName', async () => {
    render(<PhotosPage />);

    // Expect group header for element image
    expect(await screen.findByText('Exterior / Roof')).toBeInTheDocument();
  });

  it('groups inspection images by Inspections / SectionName / ElementName', async () => {
    render(<PhotosPage />);

    expect(await screen.findByText('Inspections / Exterior / Roof')).toBeInTheDocument();
  });

  it('uses special names for Cover and hides archived-only Front Elevation by default', async () => {
    render(<PhotosPage />);

    expect(await screen.findByText('Cover Image')).toBeInTheDocument();
    // Front image is archived only; the section should not render by default
    expect(screen.queryByText('Front Elevation')).not.toBeInTheDocument();
  });

  // Archived toggle behavior is exercised indirectly: archived-only groups are hidden by default
});
