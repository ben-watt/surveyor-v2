import { BuildingSurveyFormData } from '../building-survey-reports/BuildingSurveyReportSchema';

/**
 * Mock survey data for template testing and preview
 * This provides realistic sample data that matches the BuildingSurveyReportSchema
 */
export const mockSurveyData: BuildingSurveyFormData = {
  id: 'mock-survey-001',
  owner: {
    id: 'user-123',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    signaturePath: ['/signatures/sarah-johnson.png'],
  },
  status: 'draft',
  reportDetails: {
    level: '3',
    reference: 'BS-2024-001',
    address: {
      formatted: '123 High Street, Chelsea, London, SW3 4AA',
      line1: '123 High Street',
      line2: 'Chelsea',
      city: 'London',
      postcode: 'SW3 4AA',
      location: {
        lat: 51.5074,
        lng: -0.1278,
      },
    },
    clientName: 'John Smith',
    reportDate: new Date('2024-10-20'),
    inspectionDate: new Date('2024-10-15'),
    weather: 'Dry, overcast, 12°C',
    orientation: 'South-facing front elevation',
    situation: 'Mid-terrace Victorian property in residential area',
    moneyShot: [
      {
        path: '/typical-house.webp',
        isArchived: false,
        hasMetadata: true,
      },
    ],
    frontElevationImagesUri: [
      {
        path: '/typical-house.webp',
        isArchived: false,
        hasMetadata: true,
      },
    ],
  },
  propertyDescription: {
    propertyType: 'Victorian Mid-Terrace House',
    constructionDetails: 'Solid brick walls with slate roof covering',
    yearOfConstruction: '1895',
    yearOfExtensions: '2010',
    grounds: 'Small rear garden approximately 8m x 6m, paved patio area',
    services: 'Mains water, electricity, gas and drainage',
    otherServices: 'Fiber broadband connection',
    energyRating: 'C (69)',
    numberOfBedrooms: 4,
    numberOfBathrooms: 2,
    tenure: 'Freehold',
  },
  sections: [
    {
      id: 'section-external',
      name: 'External',
      elementSections: [
        {
          id: 'elem-chimney',
          name: 'Chimney Stacks',
          isPartOfSurvey: true,
          description:
            'Two brick chimney stacks visible, one to front elevation and one to rear',
          components: [
            {
              id: 'comp-chimney-1',
              inspectionId: 'insp-001',
              name: 'Front Chimney Stack',
              conditions: [
                {
                  id: 'cond-001',
                  name: 'General Condition',
                  phrase: 'The chimney stack shows signs of weathering with some loose mortar joints',
                  phraseLevel2: 'Minor weathering observed',
                },
              ],
              ragStatus: 'Amber',
              useNameOverride: false,
              nameOverride: '',
              location: 'Front elevation',
              additionalDescription: 'Visible from street level',
              images: [],
              costings: [
                {
                  cost: 800,
                  description: 'Repoint chimney stack',
                },
              ],
            },
            {
              id: 'comp-chimney-2',
              inspectionId: 'insp-002',
              name: 'Rear Chimney Stack',
              conditions: [
                {
                  id: 'cond-002',
                  name: 'General Condition',
                  phrase: 'Chimney stack in good condition with recent repointing evident',
                },
              ],
              ragStatus: 'Green',
              useNameOverride: false,
              nameOverride: '',
              location: 'Rear elevation',
              additionalDescription: '',
              images: [],
              costings: [],
            },
          ],
          images: [],
        },
        {
          id: 'elem-roof',
          name: 'Main Roof',
          isPartOfSurvey: true,
          description: 'Pitched slate roof with ridge tiles',
          components: [
            {
              id: 'comp-roof-1',
              inspectionId: 'insp-003',
              name: 'Roof Covering',
              conditions: [
                {
                  id: 'cond-003',
                  name: 'Slate Condition',
                  phrase:
                    'Natural slate roof covering in generally good condition. Several slipped slates noted on rear slope requiring attention',
                },
              ],
              ragStatus: 'Amber',
              useNameOverride: false,
              nameOverride: '',
              location: 'Entire roof',
              additionalDescription: 'Inspected from ground level and neighboring properties',
              images: [],
              costings: [
                {
                  cost: 450,
                  description: 'Replace slipped slates',
                },
              ],
            },
          ],
          images: [],
        },
        {
          id: 'elem-walls',
          name: 'External Walls',
          isPartOfSurvey: true,
          description: 'Solid brick construction with painted render to front',
          components: [
            {
              id: 'comp-walls-1',
              inspectionId: 'insp-004',
              name: 'Front Elevation',
              conditions: [
                {
                  id: 'cond-004',
                  name: 'Wall Condition',
                  phrase: 'Painted render in fair condition with minor cracking noted at first floor level',
                },
              ],
              ragStatus: 'Amber',
              useNameOverride: false,
              nameOverride: '',
              location: 'Front elevation',
              additionalDescription: '',
              images: [],
              costings: [
                {
                  cost: 1200,
                  description: 'Repair cracks and redecorate',
                },
              ],
            },
          ],
          images: [],
        },
      ],
    },
    {
      id: 'section-internal',
      name: 'Internal',
      elementSections: [
        {
          id: 'elem-damp',
          name: 'Dampness',
          isPartOfSurvey: true,
          description: 'Electronic moisture meter readings taken throughout',
          components: [
            {
              id: 'comp-damp-1',
              inspectionId: 'insp-005',
              name: 'Ground Floor',
              conditions: [
                {
                  id: 'cond-005',
                  name: 'Moisture Readings',
                  phrase:
                    'No significant dampness detected. Readings within normal range for time of year',
                },
              ],
              ragStatus: 'Green',
              useNameOverride: false,
              nameOverride: '',
              location: 'All ground floor rooms',
              additionalDescription: '',
              images: [],
              costings: [],
            },
          ],
          images: [],
        },
        {
          id: 'elem-electrical',
          name: 'Electrical Installation',
          isPartOfSurvey: true,
          description: 'Consumer unit and visible wiring inspected',
          components: [
            {
              id: 'comp-elec-1',
              inspectionId: 'insp-006',
              name: 'Consumer Unit',
              conditions: [
                {
                  id: 'cond-006',
                  name: 'Installation Condition',
                  phrase:
                    'Modern consumer unit with RCD protection installed. Recommend full electrical inspection and testing',
                },
              ],
              ragStatus: 'Amber',
              useNameOverride: false,
              nameOverride: '',
              location: 'Under stairs',
              additionalDescription: 'Last test certificate dated 2018',
              images: [],
              costings: [
                {
                  cost: 350,
                  description: 'Electrical inspection and testing (EICR)',
                },
              ],
            },
          ],
          images: [],
        },
      ],
    },
  ],
  checklist: {
    items: [
      {
        type: 'always-true-checkbox',
        value: true,
        label: 'Property inspected in accordance with RICS Home Survey Standard',
        placeholder: '',
        required: true,
        order: 0,
      },
      {
        type: 'always-true-checkbox',
        value: true,
        label: 'Client advised of limitations of inspection',
        placeholder: '',
        required: true,
        order: 1,
      },
    ],
  },
};

/**
 * Helper function to get a simplified version of mock data
 * Useful for quick testing
 */
export const getSimplifiedMockData = (): Partial<BuildingSurveyFormData> => ({
  reportDetails: mockSurveyData.reportDetails,
  propertyDescription: mockSurveyData.propertyDescription,
  owner: mockSurveyData.owner,
  status: mockSurveyData.status,
});

/**
 * Get just the report details for basic template testing
 */
export const getMockReportDetails = () => mockSurveyData.reportDetails;

/**
 * Get mock property description
 */
export const getMockPropertyDescription = () => mockSurveyData.propertyDescription;

