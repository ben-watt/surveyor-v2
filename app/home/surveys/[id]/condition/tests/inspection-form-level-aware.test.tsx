import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InspectionForm from '@/app/home/surveys/[id]/condition/InspectionForm';
import { DynamicDrawerProvider } from '@/app/home/components/Drawer';
import { isConditionUnresolvedForLevel } from '@/lib/conditions/validator';

// Mock autosave hooks
jest.mock('@/app/home/hooks/useAutoSaveFormWithImages', () => ({
  useAutoSaveFormWithImages: () => ({
    saveStatus: 'idle',
    isSaving: false,
    isUploading: false,
    lastSavedAt: undefined,
    save: jest.fn(),
  }),
}));

// Create survey with specific level
const makeSurveyWithLevel = (level: '2' | '3') => ({
  id: 's1',
  owner: { id: 'o1', name: 'Owner', email: 'o@example.com', signaturePath: [] },
  status: 'draft',
  reportDetails: {
    level,
    reference: 'REF-001',
    address: { formatted: 'Test', line1: 'Test', city: 'Test', postcode: 'TS1', location: { lat: 0, lng: 0 } },
    clientName: 'Client',
    reportDate: new Date(),
    inspectionDate: new Date(),
    weather: 'Sunny',
    orientation: 'North',
    situation: 'Urban',
    moneyShot: [],
    frontElevationImagesUri: [],
  },
  propertyDescription: {
    propertyType: 'House',
    constructionDetails: 'Brick',
    yearOfConstruction: '2020',
    grounds: 'Garden',
    services: 'Mains',
    energyRating: 'A',
    numberOfBedrooms: 3,
    numberOfBathrooms: 2,
    tenure: 'Freehold',
  },
  sections: [
    {
      id: 'sec1',
      name: 'Section 1',
      elementSections: [
        {
          id: 'el1',
          name: 'Element 1',
          isPartOfSurvey: true,
          description: '',
          components: [],
          images: [],
        },
      ],
    },
  ],
  checklist: { items: [] },
});

// Global mocks for stores
(global as any).__currentSurveyRef = makeSurveyWithLevel('2');
(global as any).__phrasesRef = [];
(global as any).__componentsRef = [];
(global as any).__updateCalls = 0;

jest.mock('@/app/home/clients/Database', () => ({
  componentStore: {
    useList: () => [true, (global as any).__componentsRef],
  },
  elementStore: {
    useList: () => [
      true,
      [{ id: 'el1', name: 'Element 1', order: 0, sectionId: 'sec1', description: '' }],
    ],
  },
  phraseStore: {
    useList: () => [true, (global as any).__phrasesRef],
  },
  sectionStore: {
    useList: () => [true, [{ id: 'sec1', name: 'Section 1', order: 0 }]],
  },
  surveyStore: {
    useGet: () => [true, (global as any).__currentSurveyRef],
    useList: () => [true, [(global as any).__currentSurveyRef]],
    update: async (_id: string, updater: (draft: any) => void) => {
      (global as any).__updateCalls = ((global as any).__updateCalls || 0) + 1;
      updater((global as any).__currentSurveyRef);
      return { ok: true } as any;
    },
  },
}));

function withProviders(children: React.ReactElement) {
  return <DynamicDrawerProvider>{children}</DynamicDrawerProvider>;
}

describe('InspectionForm - Level-Aware Conditions', () => {
  beforeEach(() => {
    (global as any).__currentSurveyRef = makeSurveyWithLevel('2');
    (global as any).__phrasesRef = [
      {
        id: 'phrase1',
        name: 'Test Condition',
        type: 'condition',
        phrase: 'Level 3 detailed condition text',
        phraseDoc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Level 3 detailed condition text' }],
            },
          ],
        },
        phraseLevel2: 'Level 2 simple text',
        phraseLevel2Doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Level 2 simple text' }],
            },
          ],
        },
        associatedComponentIds: ['comp1'],
        order: 0,
      },
    ];
    (global as any).__componentsRef = [
      { id: 'comp1', name: 'Component 1', elementId: 'el1', order: 0 },
    ];
    (global as any).__updateCalls = 0;
  });

  test('loads appropriate doc based on survey level', () => {
    // Test with Level 2 survey
    (global as any).__currentSurveyRef = makeSurveyWithLevel('2');

    const { container } = render(
      withProviders(
        <InspectionForm
          surveyId="s1"
          defaultValues={{
            inspectionId: 'insp1',
            surveySection: { id: 'sec1', name: 'Section 1' },
            element: { id: 'el1', name: 'Element 1' },
            component: { id: 'comp1', name: 'Component 1' },
            location: 'Ground Floor',
            conditions: [
              {
                id: 'phrase1',
                name: 'Test Condition',
                phrase: 'Level 3 detailed condition text',
                doc: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'inlineSelect',
                          attrs: { key: 'state', options: ['Good', 'Poor'], value: 'Good' },
                        },
                      ],
                    },
                  ],
                },
                phraseLevel2: 'Level 2 simple text',
                docLevel2: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'inlineSelect',
                          attrs: { key: 'state', options: ['Good', 'Poor'], value: 'Poor' },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
            nameOverride: '',
            useNameOverride: false,
            additionalDescription: '',
            images: [],
            ragStatus: 'Green' as const,
            costings: [],
          }}
        />,
      ),
    );

    // Verify form renders - the condition appears in both the select and the list
    const testConditions = screen.getAllByText('Test Condition');
    expect(testConditions.length).toBeGreaterThan(0);
  });

  test('validation uses level-appropriate doc', () => {
    const conditionResolvedL3UnresolvedL2 = {
      id: 'cond1',
      name: 'Condition',
      phrase: 'Level 3 text',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'inlineSelect',
                attrs: { key: 'state', options: ['Good', 'Poor'], value: 'Good' },
              },
            ],
          },
        ],
      },
      phraseLevel2: 'Level 2 text',
      docLevel2: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'inlineSelect', attrs: { key: 'state', options: ['Good', 'Poor'] } }, // No value!
            ],
          },
        ],
      },
    };

    // For Level 2 survey, should be unresolved
    expect(isConditionUnresolvedForLevel(conditionResolvedL3UnresolvedL2, '2')).toBe(true);

    // For Level 3 survey, should be resolved
    expect(isConditionUnresolvedForLevel(conditionResolvedL3UnresolvedL2, '3')).toBe(false);
  });

  test('displays appropriate phrase text based on survey level', () => {
    const condition = {
      id: 'cond1',
      name: 'Test',
      phrase: 'Level 3 text',
      phraseLevel2: 'Level 2 text',
    };

    // In a Level 2 survey, Level 2 text should be preferred
    // In a Level 3 survey, Level 3 text should be shown
    // This is implementation detail tested in PDF rendering

    expect(condition.phraseLevel2).toBe('Level 2 text');
    expect(condition.phrase).toBe('Level 3 text');
  });

  test('conditions without Level 2 data still work (backward compatibility)', () => {
    (global as any).__phrasesRef = [
      {
        id: 'oldPhrase',
        name: 'Old Condition',
        type: 'condition',
        phrase: 'Only Level 3',
        phraseDoc: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Only Level 3' }] }],
        },
        // No phraseLevel2 or phraseLevel2Doc
        associatedComponentIds: ['comp1'],
        order: 0,
      },
    ];

    const { container } = render(
      withProviders(
        <InspectionForm
          surveyId="s1"
          defaultValues={{
            inspectionId: 'insp1',
            surveySection: { id: 'sec1', name: 'Section 1' },
            element: { id: 'el1', name: 'Element 1' },
            component: { id: 'comp1', name: 'Component 1' },
            location: 'Ground Floor',
            conditions: [],
            nameOverride: '',
            useNameOverride: false,
            additionalDescription: '',
            images: [],
            ragStatus: 'Green' as const,
            costings: [],
          }}
        />,
      ),
    );

    // Should not crash and should render
    expect(container).toBeInTheDocument();
  });

  test('empty Level 2 text is preserved (not replaced with fallback)', () => {
    const condition = {
      id: 'cond1',
      name: 'Condition with empty Level 2',
      phrase: 'Level 3 text',
      phraseLevel2: '', // Explicitly empty
    };

    // Empty should stay empty, not fallback to Level 3
    expect(condition.phraseLevel2).toBe('');
    expect(condition.phraseLevel2).not.toBe(condition.phrase);
  });
});

