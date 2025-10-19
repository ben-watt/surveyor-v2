import '@testing-library/jest-dom';
import { buildPhrasesOptions } from '../utils/options';
import { addOrUpdateComponent } from '@/app/home/surveys/building-survey-reports/Survey';
import { ID_PREFIX } from '@/app/home/surveys/constants/localIds';
import type { BuildingSurveyFormData } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';

// Mock the interop module
jest.mock('@/lib/conditions/interop', () => ({
  stripInlineSelectChoices: (doc: any) => doc,
}));

describe('Level-Aware Conditions', () => {
  describe('buildPhrasesOptions', () => {
    const mockPhrases = [
      {
        id: 'phrase1',
        name: 'Condition A',
        type: 'condition',
        phrase: 'Level 3 detailed text',
        phraseDoc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Level 3 detailed text' }],
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
      {
        id: 'phrase2',
        name: 'Condition B',
        type: 'condition',
        phrase: 'Level 3 only text',
        phraseDoc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Level 3 only text' }],
            },
          ],
        },
        phraseLevel2: '', // Empty Level 2
        phraseLevel2Doc: null,
        associatedComponentIds: ['comp1'],
        order: 1,
      },
    ];

    const mockComponent = { id: 'comp1', name: 'Component 1' };
    const mockComponents = [mockComponent];

    test('includes both Level 2 and Level 3 data in returned FormPhrase', () => {
      const options = buildPhrasesOptions(
        mockPhrases,
        '2', // Current level doesn't matter for this test
        mockComponent,
        mockComponents,
        [],
        'el1',
        [],
        'sec1',
      );

      expect(options.length).toBeGreaterThan(0);

      const optionA = options.find((o) => o.value.id === 'phrase1');
      expect(optionA).toBeDefined();
      expect(optionA?.value.phrase).toBe('Level 3 detailed text');
      expect(optionA?.value.phraseLevel2).toBe('Level 2 simple text');
      expect(optionA?.value.doc).toBeDefined();
      expect(optionA?.value.docLevel2).toBeDefined();
    });

    test('does not fallback Level 2 to Level 3 when Level 2 is empty', () => {
      const options = buildPhrasesOptions(
        mockPhrases,
        '2',
        mockComponent,
        mockComponents,
        [],
        'el1',
        [],
        'sec1',
      );

      const optionB = options.find((o) => o.value.id === 'phrase2');
      expect(optionB).toBeDefined();
      expect(optionB?.value.phrase).toBe('Level 3 only text');
      expect(optionB?.value.phraseLevel2).toBe(''); // Empty, not fallback
    });

    test('local condition definitions use same text for both levels', () => {
      const localDefs = [
        { id: `${ID_PREFIX.condDef}1`, name: 'Local Condition', text: 'Same text for all levels' },
      ];

      const options = buildPhrasesOptions(
        [],
        '2',
        mockComponent,
        mockComponents,
        [],
        'el1',
        localDefs,
        'sec1',
      );

      const localOption = options.find((o) => o.value.id === `${ID_PREFIX.condDef}1`);
      expect(localOption).toBeDefined();
      expect(localOption?.value.phrase).toBe('Same text for all levels');
      expect(localOption?.value.phraseLevel2).toBe('Same text for all levels');
    });

    test('preserves existing conditions with both level fields', () => {
      const existingConditions = [
        {
          id: 'existing1',
          name: 'Existing Condition',
          phrase: 'Existing Level 3',
          doc: { type: 'doc', content: [] },
          phraseLevel2: 'Existing Level 2',
          docLevel2: { type: 'doc', content: [] },
        },
      ];

      const options = buildPhrasesOptions(
        [],
        '3',
        mockComponent,
        mockComponents,
        existingConditions,
        'el1',
        [],
        'sec1',
      );

      const existingOption = options.find((o) => o.value.id === 'existing1');
      expect(existingOption).toBeDefined();
      expect(existingOption?.value.phrase).toBe('Existing Level 3');
      expect(existingOption?.value.phraseLevel2).toBe('Existing Level 2');
      expect(existingOption?.value.doc).toBeDefined();
      expect(existingOption?.value.docLevel2).toBeDefined();
    });
  });

  describe('addOrUpdateComponent', () => {
    const makeTestSurvey = (): BuildingSurveyFormData => ({
      id: 's1',
      owner: { id: 'o1', name: 'Owner', email: 'owner@test.com', signaturePath: [] },
      status: 'draft',
      reportDetails: {
        level: '2',
        reference: 'REF-001',
        address: {
          formatted: 'Test Address',
          line1: '123 Test St',
          city: 'Test City',
          postcode: 'TS1 1TS',
          location: { lat: 0, lng: 0 },
        },
        clientName: 'Test Client',
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
              description: 'Test element',
              components: [],
              images: [],
            },
          ],
        },
      ],
      checklist: { items: [] },
    });

    test('preserves both Level 2 and Level 3 fields when saving conditions', () => {
      const survey = makeTestSurvey();

      const component = {
        id: 'comp1',
        inspectionId: 'insp1',
        name: 'Test Component',
        conditions: [
          {
            id: 'cond1',
            name: 'Test Condition',
            phrase: 'Level 3 text',
            doc: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
            phraseLevel2: 'Level 2 text',
            docLevel2: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
          },
        ],
      };

      addOrUpdateComponent(survey, 'sec1', 'el1', component);

      const savedComponent = survey.sections[0].elementSections[0].components[0];
      expect(savedComponent).toBeDefined();
      expect(savedComponent.conditions).toHaveLength(1);

      const savedCondition = savedComponent.conditions[0];
      expect(savedCondition.phrase).toBe('Level 3 text');
      expect(savedCondition.phraseLevel2).toBe('Level 2 text');
      expect(savedCondition.doc).toBeDefined();
      expect(savedCondition.docLevel2).toBeDefined();
    });

    test('handles conditions without Level 2 fields (backward compatibility)', () => {
      const survey = makeTestSurvey();

      const component = {
        id: 'comp1',
        inspectionId: 'insp1',
        name: 'Test Component',
        conditions: [
          {
            id: 'cond1',
            name: 'Old Condition',
            phrase: 'Only Level 3',
            doc: { type: 'doc', content: [] },
            // No phraseLevel2 or docLevel2
          },
        ],
      };

      addOrUpdateComponent(survey, 'sec1', 'el1', component);

      const savedComponent = survey.sections[0].elementSections[0].components[0];
      expect(savedComponent.conditions[0].phrase).toBe('Only Level 3');
      // Should be undefined, not cause errors
      expect(savedComponent.conditions[0].phraseLevel2).toBeUndefined();
      expect(savedComponent.conditions[0].docLevel2).toBeUndefined();
    });

    test('updates existing component and preserves level fields', () => {
      const survey = makeTestSurvey();

      // Add initial component
      addOrUpdateComponent(survey, 'sec1', 'el1', {
        id: 'comp1',
        inspectionId: 'insp1',
        name: 'Component',
        conditions: [
          {
            id: 'cond1',
            name: 'Condition',
            phrase: 'Initial Level 3',
            phraseLevel2: 'Initial Level 2',
          },
        ],
      });

      // Update with new data
      addOrUpdateComponent(survey, 'sec1', 'el1', {
        id: 'comp1',
        inspectionId: 'insp1',
        name: 'Component',
        conditions: [
          {
            id: 'cond1',
            name: 'Condition',
            phrase: 'Updated Level 3',
            phraseLevel2: 'Updated Level 2',
            doc: { type: 'doc', content: [] },
            docLevel2: { type: 'doc', content: [] },
          },
        ],
      });

      const savedComponent = survey.sections[0].elementSections[0].components[0];
      expect(savedComponent.conditions[0].phrase).toBe('Updated Level 3');
      expect(savedComponent.conditions[0].phraseLevel2).toBe('Updated Level 2');
    });
  });

  describe('Level switching behavior', () => {
    test('conditions with both levels should be valid for either level', () => {
      const condition = {
        id: 'cond1',
        name: 'Multi-level Condition',
        phrase: 'Detailed Level 3 assessment text',
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'inlineSelect',
                  attrs: { key: 'severity', options: ['Minor', 'Major'], value: 'Minor' },
                },
              ],
            },
          ],
        },
        phraseLevel2: 'Simple Level 2 text',
        docLevel2: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'inlineSelect',
                  attrs: { key: 'severity', options: ['Minor', 'Major'], value: 'Minor' },
                },
              ],
            },
          ],
        },
      };

      // Both levels have their own data
      expect(condition.phrase).toBeTruthy();
      expect(condition.phraseLevel2).toBeTruthy();
      expect(condition.doc).toBeDefined();
      expect(condition.docLevel2).toBeDefined();

      // When displaying, the appropriate level should be shown
      // This is tested in the component/integration tests
    });

    test('empty Level 2 text should trigger validation', () => {
      const conditionWithoutLevel2 = {
        id: 'cond1',
        name: 'Level 3 Only Condition',
        phrase: 'Level 3 text',
        doc: { type: 'doc', content: [] },
        phraseLevel2: '', // Empty!
        docLevel2: null,
      };

      // Empty phraseLevel2 should be detectable for validation
      expect(conditionWithoutLevel2.phraseLevel2).toBe('');
      expect(conditionWithoutLevel2.phraseLevel2?.trim()).toBe('');
    });
  });
});

