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
    getActiveImages: jest.fn().mockResolvedValue({
      ok: true,
      val: [
        {
          id: 'img1',
          imagePath: 'report-images/survey-1/elements/e1/a.jpg',
          thumbnailDataUrl: 'data:image/jpeg;base64,AAA',
          isArchived: false,
          fileName: 'a.jpg',
        },
        {
          id: 'img2',
          imagePath: 'report-images/survey-1/inspections/insp-1/b.jpg',
          thumbnailDataUrl: 'data:image/jpeg;base64,AAA',
          isArchived: false,
          fileName: 'b.jpg',
        },
        {
          id: 'img3',
          imagePath: 'report-images/survey-1/money-shot/cover.jpg',
          thumbnailDataUrl: 'data:image/jpeg;base64,AAA',
          isArchived: false,
          fileName: 'cover.jpg',
        },
      ],
    }),
    getArchivedImages: jest
      .fn()
      .mockResolvedValue({
        ok: true,
        val: [
          {
            id: 'img4',
            imagePath: 'report-images/survey-1/front-elevation/front.jpg',
            thumbnailDataUrl: 'data:image/jpeg;base64,AAA',
            isArchived: true,
            fileName: 'front.jpg',
          },
        ],
      }),
    getFullImageUrl: jest.fn().mockResolvedValue({ ok: true, val: 'https://example.com/full.jpg' }),
  },
}));

// Mock stores: survey, elements, sections
jest.mock('@/app/home/clients/Database', () => ({
  surveyStore: {
    useGet: (id: string) => [
      true,
      {
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
                  {
                    id: 'comp-1',
                    inspectionId: 'insp-1',
                    name: 'Gutters',
                    nameOverride: 'Gutters',
                    useNameOverride: false,
                    location: '',
                    additionalDescription: '',
                    images: [],
                    conditions: [],
                    ragStatus: 'N/I',
                    costings: [],
                  },
                ],
              },
            ],
          },
        ],
        reportDetails: {},
      },
    ],
  },
  elementStore: {
    useList: () => [
      true,
      [
        {
          id: 'e1',
          name: 'Roof',
          order: 0,
          sectionId: 'sec-1',
          description: '',
          createdAt: '',
          updatedAt: '',
          syncStatus: 'synced',
          tenantId: 't1',
        },
      ],
    ],
  },
  sectionStore: {
    useList: () => [
      true,
      [
        {
          id: 'sec-1',
          name: 'Exterior',
          order: 0,
          createdAt: '',
          updatedAt: '',
          syncStatus: 'synced',
          tenantId: 't1',
        },
      ],
    ],
  },
}));

// Import after mocks
import PhotosPage from '../page';
import userEvent from '@testing-library/user-event';

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

describe('PhotosPage export', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['zip']) });
  });

  it('renders Export ZIP and posts items to API', async () => {
    render(<PhotosPage />);

    const btn = await screen.findByRole('button', { name: /export zip/i });
    expect(btn).toBeInTheDocument();

    await userEvent.click(btn);

    // @ts-ignore
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toContain('/api/surveys/survey-1/photos/export?includeArchived=false');
    const opts = call[1];
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(Array.isArray(body.items)).toBe(true);
    // 3 active + 1 archived items total supplied (server filters archived by query)
    expect(body.items.length).toBeGreaterThanOrEqual(3);
    // Ensure we include a fullUrl for full-resolution export
    expect(body.items[0].fullUrl).toBe('https://example.com/full.jpg');
  });
});
