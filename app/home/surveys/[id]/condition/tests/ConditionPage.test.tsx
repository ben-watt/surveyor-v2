import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stub the drawer to render content inline
jest.mock('@/app/home/components/Drawer', () => ({
  DynamicDrawer: ({ content }: any) => <>{content}</>,
  useDynamicDrawer: () => ({ openDrawer: jest.fn() }),
}));

// Mock router/params
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'survey-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

// Mock survey store with one valid and one invalid section
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
                components: [],
                images: [],
              },
              {
                id: 'e2',
                name: null as any,
                isPartOfSurvey: true,
                description: '',
                components: [],
                images: [],
              },
            ],
          },
          { id: 'sec-2', name: null as any, elementSections: [] },
        ],
        reportDetails: {},
      },
    ],
  },
}));

import ConditionPage from '../page';

describe('ConditionPage filtering and safety', () => {
  it('filters out sections with null/empty names and renders valid section', async () => {
    render(<ConditionPage />);

    // Valid section title renders
    expect(await screen.findByText('Exterior')).toBeInTheDocument();

    // Invalid section should not render
    expect(screen.queryByText('(Untitled Section)')).not.toBeInTheDocument();
  });

  it('search is null-safe for element names', async () => {
    render(<ConditionPage />);

    const input = await screen.findByPlaceholderText('Search elements...');
    await userEvent.type(input, 'roof');

    // Should still find Roof and not crash on null element name
    expect(await screen.findByText('Roof')).toBeInTheDocument();
  });
});
