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

const baseSurvey = () => ({
  id: 's1',
  owner: { id: 'o1', name: 'Owner', email: 'o@example.com', signaturePath: [] },
  status: 'draft',
  reportDetails: { level: '2' },
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

(global as any).__currentSurveyRef = baseSurvey();

jest.mock('@/app/home/clients/Database', () => ({
  componentStore: { useList: () => [true, []] },
  elementStore: {
    useList: () => [true, [{ id: 'el1', name: 'Element 1', order: 0, sectionId: 'sec1', description: '' }]],
  },
  phraseStore: { useList: () => [true, []] },
  sectionStore: { useList: () => [true, [{ id: 'sec1', name: 'Section 1', order: 0 }]] },
  surveyStore: {
    useGet: () => [true, (global as any).__currentSurveyRef],
    useList: () => [true, [(global as any).__currentSurveyRef]],
    update: async (_id: string, updater: (draft: any) => void) => {
      updater((global as any).__currentSurveyRef);
      return { ok: true } as any;
    },
  },
}));

function withProviders(children: React.ReactElement) {
  return <DynamicDrawerProvider>{children}</DynamicDrawerProvider>;
}

describe('InspectionForm - unresolved indicators (no banner)', () => {
  beforeEach(() => {
    (global as any).__currentSurveyRef = baseSurvey();
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
            component: { id: 'local_1', name: 'Local' },
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

  test('no banner is rendered; per-item indicators are used instead', async () => {
    const unresolvedDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'A ' },
            { type: 'inlineSelect', attrs: { key: 'k', options: ['a', 'b'] } },
          ],
        },
      ],
    } as any;
    const resolvedDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'A ' },
            { type: 'inlineSelect', attrs: { key: 'k', options: ['a', 'b'], defaultValue: 'a' } },
          ],
        },
      ],
    } as any;

    renderForm({
      conditions: [
        { id: 'c1', name: 'No Doc', phrase: 'plain text' } as any,
        { id: 'c2', name: 'Unresolved', phrase: '', doc: unresolvedDoc } as any,
        { id: 'c3', name: 'Resolved', phrase: '', doc: resolvedDoc } as any,
        { id: 'c4', name: 'Phrase token unresolved', phrase: 'Has {{select:state|A|B}}' } as any,
      ],
    });

    const bannerQuery = screen.queryByText(/conditions need selection|condition needs selection/);
    expect(bannerQuery).toBeNull();
  });
});


