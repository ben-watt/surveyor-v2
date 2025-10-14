import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
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

const makeSurveyWithLocalDef = () => ({
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
          localComponentDefs: [
            { id: 'localdef_1', name: 'Lintel', elementId: 'el1', materials: [] },
          ],
        },
      ],
    },
  ],
  checklist: { items: [] },
});

(global as any).__currentSurveyRef = makeSurveyWithLocalDef();

jest.mock('@/app/home/clients/Database', () => {
  return {
    componentStore: {
      useList: () => [true, []],
    },
    elementStore: {
      useList: () => [
        true,
        [{ id: 'el1', name: 'Element 1', order: 0, sectionId: 'sec1', description: '' }],
      ],
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
      update: async (_id: string, updater: (draft: any) => void) => {
        updater((global as any).__currentSurveyRef);
        return { ok: true } as any;
      },
    },
  };
});

function withProviders(children: React.ReactElement) {
  return <DynamicDrawerProvider>{children}</DynamicDrawerProvider>;
}

describe('InspectionForm - Local Component Definitions', () => {
  beforeEach(() => {
    (global as any).__currentSurveyRef = makeSurveyWithLocalDef();
  });

  function renderForm(defaults?: Partial<any>) {
    return render(
      withProviders(
        <InspectionForm
          surveyId="s1"
          defaultValues={{
            inspectionId: 'insp-1',
            // Simulate timing where surveySection is not yet set
            surveySection: { id: '', name: '' },
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

  test('shows local component defs even when surveySection.id not yet set', async () => {
    renderForm();
    const combos = await screen.findAllByRole('combobox');
    const componentCombo = combos[2];
    fireEvent.click(componentCombo);
    expect(await screen.findByText('Lintel - (survey only)')).toBeInTheDocument();
  });
});
