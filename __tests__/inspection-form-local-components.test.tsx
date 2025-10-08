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

// In-memory survey state we can mutate via surveyStore.update mock
const makeEmptySurvey = () => ({
  id: 's1',
  owner: { id: 'o1', name: 'Owner', email: 'o@example.com', signaturePath: [] },
  status: 'draft',
  reportDetails: {
    level: '2', reference: '',
    address: { formatted: '', line1: '', city: '', postcode: '', location: { lat: 0, lng: 0 } },
    clientName: '', reportDate: new Date(), inspectionDate: new Date(), weather: '', orientation: '', situation: '',
    moneyShot: [], frontElevationImagesUri: []
  },
  propertyDescription: {
    propertyType: '', constructionDetails: '', yearOfConstruction: '', grounds: '', services: '', energyRating: '',
    numberOfBedrooms: 0, numberOfBathrooms: 0, tenure: ''
  },
  sections: [
    { id: 'sec1', name: 'Section 1', elementSections: [
      { id: 'el1', name: 'Element 1', isPartOfSurvey: true, description: '', components: [], images: [] }
    ]}
  ],
  checklist: { items: [] },
});

// Global ref so the mock factory can access without hoisting issues
(global as any).__currentSurveyRef = makeEmptySurvey();

jest.mock('@/app/home/clients/Database', () => {
  return {
    componentStore: {
      useList: () => [true, []],
    },
    elementStore: {
      useList: () => [true, [{ id: 'el1', name: 'Element 1', order: 0, sectionId: 'sec1', description: '' }]],
    },
    phraseStore: {
      useList: () => [true, []],
    },
    sectionStore: {
      useList: () => [true, [{ id: 'sec1', name: 'Section 1', order: 0 }]],
    },
    surveyStore: {
      useGet: (id: string) => [true, (global as any).__currentSurveyRef],
      useList: () => [true, [(global as any).__currentSurveyRef]],
      update: async (id: string, updater: (draft: any) => void) => {
        (global as any).__updateCalls = ((global as any).__updateCalls || 0) + 1;
        updater((global as any).__currentSurveyRef);
        return { ok: true } as any;
      },
    },
  };
});

// Helper wrapper to provide drawer context
function withProviders(children: React.ReactElement) {
  return <DynamicDrawerProvider>{children}</DynamicDrawerProvider>;
}

describe('InspectionForm - Local Components', () => {
  beforeEach(() => {
    (global as any).__currentSurveyRef = makeEmptySurvey();
    (global as any).__updateCalls = 0;
  });

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
        />
      )
    );
  }

  test('shows local selection label when component is local', async () => {
    renderForm({ component: { id: 'local_abc', name: 'My Local' } });

    const comboTriggers = await screen.findAllByRole('combobox');
    const trigger = comboTriggers[2]; // Survey Section, Element, then Component
    expect(trigger).toHaveTextContent('My Local - (survey only)');
  });

  test('creating a local component persists immediately and selects it', async () => {
    renderForm();

    // Open the Component combobox
    const comboTriggers = await screen.findAllByRole('combobox');
    const trigger = comboTriggers[2];
    fireEvent.click(trigger);

    // Click "Create new..."
    const createNew = await screen.findByText(/create new/i);
    fireEvent.click(createNew);

    // Fill out the local name prompt and create
    const input = await screen.findByPlaceholderText(/enter component name/i);
    fireEvent.change(input, { target: { value: 'Lintel' } });
    const createBtn = await screen.findByRole('button', { name: /create/i });
    fireEvent.click(createBtn);

    // surveyStore.update should have been called (tracked via global ref)
    await waitFor(() => expect((global as any).__updateCalls).toBeGreaterThan(0));

    // The selection should show our name with the survey-only suffix
    const triggerAfter = (await screen.findAllByRole('combobox'))[2];
    expect(triggerAfter).toHaveTextContent('Lintel - (survey only)');

    // The survey data should contain the inspection persisted under the element
    const element = (global as any).__currentSurveyRef.sections[0].elementSections[0];
    expect(element.components.some((c: any) => c.name === 'Lintel' && String(c.id || '').startsWith('local_'))).toBe(true);
  });

  test('creating a local condition persists immediately and is visible as selected', async () => {
    renderForm({ component: { id: 'local_abc', name: 'My Local' } });

    // Open the Condition combobox
    const comboTriggers = await screen.findAllByRole('combobox');
    // Order: Survey Section, Element, Component, RAG, Condition
    const conditionTrigger = comboTriggers[4];
    fireEvent.click(conditionTrigger);

    // Click "Create new..."
    const createNew = await screen.findByText(/create new/i);
    fireEvent.click(createNew);

    // Fill out the local condition prompt and create
    const nameInput = await screen.findByPlaceholderText(/deteriorated mortar/i);
    fireEvent.change(nameInput, { target: { value: 'Cracked brick' } });
    const textInput = await screen.findByPlaceholderText(/describe the condition/i);
    fireEvent.change(textInput, { target: { value: 'Cracking observed around lintel' } });
    const addBtn = await screen.findByRole('button', { name: /create & add/i });
    fireEvent.click(addBtn);

    // surveyStore.update should have been called
    await waitFor(() => expect((global as any).__updateCalls).toBeGreaterThan(0));

    // Reopen the Condition combobox and verify selected label contains our local condition
    fireEvent.click(conditionTrigger);
    const matches = await screen.findAllByText('Cracked brick - (survey only)');
    expect(matches.length).toBeGreaterThan(0);
  });
});
