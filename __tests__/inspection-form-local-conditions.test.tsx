import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import InspectionForm from '@/app/home/surveys/[id]/condition/InspectionForm';
import { DynamicDrawerProvider } from '@/app/home/components/Drawer';

// Mock autosave hooks to avoid timers/side effects
jest.mock('@/app/home/hooks/useAutoSaveFormWithImages', () => ({
  useAutoSaveFormWithImages: () => ({
    saveStatus: 'idle',
    isSaving: false,
    isUploading: false,
    lastSavedAt: undefined,
    save: jest.fn(),
  }),
}));

// In-memory survey and dynamic stores so we can vary data per test
const makeEmptySurvey = () => ({
  id: 's1',
  owner: { id: 'o1', name: 'Owner', email: 'o@example.com', signaturePath: [] },
  status: 'draft',
  reportDetails: {
    level: '2',
    reference: '',
    address: { formatted: '', line1: '', city: '', postcode: '', location: { lat: 0, lng: 0 } },
    clientName: '',
    reportDate: new Date(),
    inspectionDate: new Date(),
    weather: '',
    orientation: '',
    situation: '',
    moneyShot: [],
    frontElevationImagesUri: [],
  },
  propertyDescription: {
    propertyType: '',
    constructionDetails: '',
    yearOfConstruction: '',
    grounds: '',
    services: '',
    energyRating: '',
    numberOfBedrooms: 0,
    numberOfBathrooms: 0,
    tenure: '',
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

(global as any).__currentSurveyRef = makeEmptySurvey();
(global as any).__phrasesRef = [] as any[];
(global as any).__componentsRef = [] as any[];
(global as any).__updateCalls = 0;

jest.mock('@/app/home/clients/Database', () => {
  return {
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
      useGet: (id: string) => [true, (global as any).__currentSurveyRef],
      useList: () => [true, [(global as any).__currentSurveyRef]],
      update: async (_id: string, updater: (draft: any) => void) => {
        (global as any).__updateCalls = ((global as any).__updateCalls || 0) + 1;
        updater((global as any).__currentSurveyRef);
        return { ok: true } as any;
      },
    },
  };
});

function withProviders(children: React.ReactElement) {
  return <DynamicDrawerProvider>{children}</DynamicDrawerProvider>;
}

function renderForm(defaults?: Partial<any>) {
  return render(
    withProviders(
      <InspectionForm
        surveyId="s1"
        defaultValues={{
          inspectionId: 'insp-1',
          surveySection: { id: 'sec1', name: 'Section 1' },
          element: { id: 'el1', name: 'Element 1' },
          component: { id: '', name: '' },
          ragStatus: 'N/I',
          conditions: [],
          images: [],
          costings: [],
          ...defaults,
        }}
      />,
    ),
  );
}

describe('InspectionForm - Conditions', () => {
  beforeEach(() => {
    (global as any).__currentSurveyRef = makeEmptySurvey();
    (global as any).__phrasesRef = [];
    (global as any).__componentsRef = [];
    (global as any).__updateCalls = 0;
  });

  test('local component shows all condition phrases (bypasses association)', async () => {
    // Provide two phrases, only one associated to a fake global id
    (global as any).__phrasesRef = [
      {
        id: 'p1',
        name: 'Associated Phrase',
        type: 'Condition',
        order: 1,
        phrase: 'P3 text',
        phraseLevel2: 'P2 text',
        associatedComponentIds: ['comp1'],
      },
      {
        id: 'p2',
        name: 'Unassociated Phrase',
        type: 'Condition',
        order: 2,
        phrase: 'P3 text',
        phraseLevel2: 'P2 text',
        associatedComponentIds: [],
      },
    ];

    renderForm({ component: { id: 'local_abc', name: 'Local Comp' } });

    // Open Condition combobox (5th combobox in order)
    const comboTriggers = await screen.findAllByRole('combobox');
    const conditionTrigger = comboTriggers[4];
    fireEvent.click(conditionTrigger);

    // Expect to see both phrases listed
    expect(await screen.findByText('Associated Phrase')).toBeInTheDocument();
    expect(await screen.findByText('Unassociated Phrase')).toBeInTheDocument();
  });

  test('global component filters phrases by association', async () => {
    // Setup a global component for the element
    (global as any).__componentsRef = [{ id: 'comp1', name: 'Header', elementId: 'el1' }];
    (global as any).__phrasesRef = [
      {
        id: 'p1',
        name: 'Associated Phrase',
        type: 'Condition',
        order: 1,
        phrase: 'P3 text',
        phraseLevel2: 'P2 text',
        associatedComponentIds: ['comp1'],
      },
      {
        id: 'p2',
        name: 'Unassociated Phrase',
        type: 'Condition',
        order: 2,
        phrase: 'P3 text',
        phraseLevel2: 'P2 text',
        associatedComponentIds: [],
      },
    ];

    renderForm({ component: { id: 'comp1', name: 'Header' } });

    // Open Condition combobox
    const comboTriggers = await screen.findAllByRole('combobox');
    const conditionTrigger = comboTriggers[4];
    fireEvent.click(conditionTrigger);

    // Only associated phrase should appear
    expect(await screen.findByText('Associated Phrase')).toBeInTheDocument();
    expect(screen.queryByText('Unassociated Phrase')).toBeNull();
  });

  test('creating a local condition persists immediately', async () => {
    renderForm({ component: { id: 'local_abc', name: 'Local Comp' } });

    // Open Condition combobox and choose Create new
    const comboTriggers = await screen.findAllByRole('combobox');
    const conditionTrigger = comboTriggers[4];
    fireEvent.click(conditionTrigger);
    const createNew = await screen.findByText(/create new/i);
    fireEvent.click(createNew);

    // Fill prompt and add
    const nameInput = await screen.findByPlaceholderText(/deteriorated mortar/i);
    fireEvent.change(nameInput, { target: { value: 'Spalled brick' } });
    const textInput = await screen.findByPlaceholderText(/describe the condition/i);
    fireEvent.change(textInput, { target: { value: 'Spalling noted at base' } });
    const addBtn = await screen.findByRole('button', { name: /create & add/i });
    fireEvent.click(addBtn);

    // Persist called
    await waitFor(() => expect((global as any).__updateCalls).toBeGreaterThan(0));

    // Selected value shows the local condition label
    fireEvent.click(conditionTrigger);
    const matches = await screen.findAllByText('Spalled brick - (survey only)');
    expect(matches.length).toBeGreaterThan(0);
  });
});
