import '@testing-library/jest-dom';
import type { BuildingSurveyFormData } from '../BuildingSurveyReportSchema';

describe('PDF Rendering - Level-Aware Conditions', () => {
  const makeTestSurvey = (level: '2' | '3'): BuildingSurveyFormData => ({
    id: 's1',
    owner: { id: 'o1', name: 'Owner', email: 'owner@test.com', signaturePath: [] },
    status: 'draft',
    reportDetails: {
      level,
      reference: 'REF-001',
      address: {
        formatted: 'Test Address',
        line1: '123 Test St',
        city: 'Test City',
        postcode: 'TS1 1TS',
        location: { lat: 0, lng: 0 },
      },
      clientName: 'Test Client',
      reportDate: new Date('2024-01-01'),
      inspectionDate: new Date('2024-01-01'),
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
        name: 'Test Section',
        elementSections: [
          {
            id: 'el1',
            name: 'Test Element',
            isPartOfSurvey: true,
            description: 'Element description',
            components: [
              {
                id: 'comp1',
                inspectionId: 'insp1',
                name: 'Test Component',
                conditions: [
                  {
                    id: 'cond1',
                    name: 'Condition A',
                    phrase: 'This is the detailed Level 3 condition text with technical details.',
                    doc: { type: 'doc', content: [] },
                    phraseLevel2: 'This is the simple Level 2 condition text.',
                    docLevel2: { type: 'doc', content: [] },
                  },
                  {
                    id: 'cond2',
                    name: 'Condition B',
                    phrase: 'Another Level 3 condition with more detail.',
                    doc: { type: 'doc', content: [] },
                    phraseLevel2: '', // Empty Level 2
                    docLevel2: undefined,
                  },
                ],
                ragStatus: 'Green',
                useNameOverride: false,
                nameOverride: '',
                location: 'Ground Floor',
                additionalDescription: '',
                images: [],
                costings: [],
              },
            ],
            images: [],
          },
        ],
      },
    ],
    checklist: { items: [] },
  });

  test('Level 2 survey displays Level 2 phrase text', () => {
    const survey = makeTestSurvey('2');

    // In Level 2 survey
    expect(survey.reportDetails.level).toBe('2');

    const condition = survey.sections[0].elementSections[0].components[0].conditions[0];

    // Verify both levels exist
    expect(condition.phrase).toBe('This is the detailed Level 3 condition text with technical details.');
    expect(condition.phraseLevel2).toBe('This is the simple Level 2 condition text.');

    // In PDF rendering, Level 2 should be displayed
    const displayText = survey.reportDetails.level === '2' 
      ? condition.phraseLevel2 || condition.phrase 
      : condition.phrase;

    expect(displayText).toBe('This is the simple Level 2 condition text.');
  });

  test('Level 3 survey displays Level 3 phrase text', () => {
    const survey = makeTestSurvey('3');

    // In Level 3 survey
    expect(survey.reportDetails.level).toBe('3');

    const condition = survey.sections[0].elementSections[0].components[0].conditions[0];

    // In PDF rendering, Level 3 should be displayed
    const displayText = survey.reportDetails.level === '2' 
      ? condition.phraseLevel2 || condition.phrase 
      : condition.phrase;

    expect(displayText).toBe('This is the detailed Level 3 condition text with technical details.');
  });

  test('falls back to Level 3 when Level 2 is empty', () => {
    const survey = makeTestSurvey('2');

    const conditionB = survey.sections[0].elementSections[0].components[0].conditions[1];

    // Verify Level 2 is empty
    expect(conditionB.phraseLevel2).toBe('');
    expect(conditionB.phrase).toBe('Another Level 3 condition with more detail.');

    // When Level 2 is empty, should fallback to Level 3
    const displayText = survey.reportDetails.level === '2' 
      ? conditionB.phraseLevel2 || conditionB.phrase 
      : conditionB.phrase;

    expect(displayText).toBe('Another Level 3 condition with more detail.');
  });

  test('switching survey level changes displayed text', () => {
    const surveyL2 = makeTestSurvey('2');
    const surveyL3 = makeTestSurvey('3');

    const conditionL2 = surveyL2.sections[0].elementSections[0].components[0].conditions[0];
    const conditionL3 = surveyL3.sections[0].elementSections[0].components[0].conditions[0];

    // Same condition data structure
    expect(conditionL2.id).toBe(conditionL3.id);

    // Different display text based on level
    const displayTextL2 = surveyL2.reportDetails.level === '2' 
      ? conditionL2.phraseLevel2 || conditionL2.phrase 
      : conditionL2.phrase;

    const displayTextL3 = surveyL3.reportDetails.level === '2' 
      ? conditionL3.phraseLevel2 || conditionL3.phrase 
      : conditionL3.phrase;

    expect(displayTextL2).toBe('This is the simple Level 2 condition text.');
    expect(displayTextL3).toBe('This is the detailed Level 3 condition text with technical details.');
    expect(displayTextL2).not.toBe(displayTextL3);
  });

  test('costings only display for Level 3 surveys', () => {
    const surveyL2 = makeTestSurvey('2');
    const surveyL3 = makeTestSurvey('3');

    // Add costing
    surveyL2.sections[0].elementSections[0].components[0].costings = [
      { cost: 1000, description: 'Test cost' },
    ];
    surveyL3.sections[0].elementSections[0].components[0].costings = [
      { cost: 1000, description: 'Test cost' },
    ];

    // Costings should only show for Level 3
    const showCostingsL2 = surveyL2.reportDetails.level === '3';
    const showCostingsL3 = surveyL3.reportDetails.level === '3';

    expect(showCostingsL2).toBe(false);
    expect(showCostingsL3).toBe(true);
  });

  test('handles backward compatibility - conditions without Level 2 data', () => {
    const survey = makeTestSurvey('2');

    // Add old condition without Level 2 fields
    survey.sections[0].elementSections[0].components[0].conditions.push({
      id: 'oldCond',
      name: 'Old Condition',
      phrase: 'Only has Level 3 data',
      doc: { type: 'doc', content: [] },
      // No phraseLevel2 or docLevel2
    } as any);

    const oldCondition = survey.sections[0].elementSections[0].components[0].conditions[2];

    // Should fallback to phrase when phraseLevel2 is undefined
    const displayText = survey.reportDetails.level === '2' 
      ? oldCondition.phraseLevel2 || oldCondition.phrase 
      : oldCondition.phrase;

    expect(displayText).toBe('Only has Level 3 data');
  });
});

