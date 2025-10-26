/**
 * Schema Parser for Building Survey Template Variables
 *
 * This module provides utilities to extract and organize all available
 * variables from the BuildingSurveyFormData schema for use in templates.
 */

export type VariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'image';

export type SchemaVariable = {
  path: string;
  type: VariableType;
  label: string;
  children?: SchemaVariable[];
  description?: string;
  helperHints?: string[];
};

/**
 * Parse the BuildingSurveyFormData schema and return a structured tree
 * of all available variables for template usage.
 */
export function parseSchema(): SchemaVariable[] {
  return [
    {
      path: 'reportDetails',
      type: 'object',
      label: 'Report Details',
      children: [
        {
          path: 'reportDetails.level',
          type: 'string',
          label: 'Survey Level',
          description: '2 or 3',
          helperHints: ['levelLabel'],
        },
        {
          path: 'reportDetails.reference',
          type: 'string',
          label: 'Reference Number',
        },
        {
          path: 'reportDetails.clientName',
          type: 'string',
          label: 'Client Name',
        },
        {
          path: 'reportDetails.reportDate',
          type: 'date',
          label: 'Report Date',
          helperHints: ['formatDate'],
        },
        {
          path: 'reportDetails.inspectionDate',
          type: 'date',
          label: 'Inspection Date',
          helperHints: ['formatDate'],
        },
        {
          path: 'reportDetails.weather',
          type: 'string',
          label: 'Weather Conditions',
        },
        {
          path: 'reportDetails.orientation',
          type: 'string',
          label: 'Property Orientation',
        },
        {
          path: 'reportDetails.situation',
          type: 'string',
          label: 'Property Situation',
        },
        {
          path: 'reportDetails.address',
          type: 'object',
          label: 'Address',
          helperHints: ['formatAddress'],
          children: [
            {
              path: 'reportDetails.address.formatted',
              type: 'string',
              label: 'Formatted Address',
            },
            {
              path: 'reportDetails.address.line1',
              type: 'string',
              label: 'Address Line 1',
            },
            {
              path: 'reportDetails.address.line2',
              type: 'string',
              label: 'Address Line 2',
            },
            {
              path: 'reportDetails.address.line3',
              type: 'string',
              label: 'Address Line 3',
            },
            {
              path: 'reportDetails.address.city',
              type: 'string',
              label: 'City',
            },
            {
              path: 'reportDetails.address.county',
              type: 'string',
              label: 'County',
            },
            {
              path: 'reportDetails.address.postcode',
              type: 'string',
              label: 'Postcode',
            },
            {
              path: 'reportDetails.address.location.lat',
              type: 'number',
              label: 'Latitude',
            },
            {
              path: 'reportDetails.address.location.lng',
              type: 'number',
              label: 'Longitude',
            },
          ],
        },
      ],
    },
    {
      path: 'propertyDescription',
      type: 'object',
      label: 'Property Description',
      children: [
        {
          path: 'propertyDescription.propertyType',
          type: 'string',
          label: 'Property Type',
        },
        {
          path: 'propertyDescription.constructionDetails',
          type: 'string',
          label: 'Construction Details',
        },
        {
          path: 'propertyDescription.yearOfConstruction',
          type: 'string',
          label: 'Year of Construction',
        },
        {
          path: 'propertyDescription.yearOfExtensions',
          type: 'string',
          label: 'Year of Extensions',
        },
        {
          path: 'propertyDescription.yearOfConversions',
          type: 'string',
          label: 'Year of Conversions',
        },
        {
          path: 'propertyDescription.grounds',
          type: 'string',
          label: 'Grounds',
        },
        {
          path: 'propertyDescription.services',
          type: 'string',
          label: 'Services',
        },
        {
          path: 'propertyDescription.otherServices',
          type: 'string',
          label: 'Other Services',
        },
        {
          path: 'propertyDescription.energyRating',
          type: 'string',
          label: 'Energy Rating',
        },
        {
          path: 'propertyDescription.numberOfBedrooms',
          type: 'number',
          label: 'Number of Bedrooms',
          helperHints: ['formatNumber'],
        },
        {
          path: 'propertyDescription.numberOfBathrooms',
          type: 'number',
          label: 'Number of Bathrooms',
          helperHints: ['formatNumber'],
        },
        {
          path: 'propertyDescription.tenure',
          type: 'string',
          label: 'Tenure',
        },
      ],
    },
    {
      path: 'sections',
      type: 'array',
      label: 'Survey Sections',
      description: 'Use with {{#each sections}}',
      helperHints: ['length', 'hasItems', 'totalCostings', 'countByStatus'],
      children: [
        {
          path: 'sections[].id',
          type: 'string',
          label: 'Section ID',
          description: 'Inside {{#each sections}} use {{this.id}}',
        },
        {
          path: 'sections[].name',
          type: 'string',
          label: 'Section Name',
          description: 'Inside {{#each sections}} use {{this.name}}',
        },
        {
          path: 'sections[].elementSections',
          type: 'array',
          label: 'Element Sections',
          description: 'Use with {{#each this.elementSections}}',
          children: [
            {
              path: 'sections[].elementSections[].id',
              type: 'string',
              label: 'Element ID',
              description: 'Use {{this.id}}',
            },
            {
              path: 'sections[].elementSections[].name',
              type: 'string',
              label: 'Element Name',
              description: 'Use {{this.name}}',
            },
            {
              path: 'sections[].elementSections[].isPartOfSurvey',
              type: 'boolean',
              label: 'Is Part of Survey',
              description: 'Use with {{#if this.isPartOfSurvey}}',
            },
            {
              path: 'sections[].elementSections[].description',
              type: 'string',
              label: 'Element Description',
              description: 'Use {{this.description}}',
            },
            {
              path: 'sections[].elementSections[].components',
              type: 'array',
              label: 'Components',
              description: 'Use with {{#each this.components}}',
              children: [
                {
                  path: 'sections[].elementSections[].components[].id',
                  type: 'string',
                  label: 'Component ID',
                  description: 'Use {{this.id}}',
                },
                {
                  path: 'sections[].elementSections[].components[].name',
                  type: 'string',
                  label: 'Component Name',
                  description: 'Use {{this.name}}',
                },
                {
                  path: 'sections[].elementSections[].components[].location',
                  type: 'string',
                  label: 'Location',
                  description: 'Use {{this.location}}',
                },
                {
                  path: 'sections[].elementSections[].components[].ragStatus',
                  type: 'string',
                  label: 'RAG Status',
                  description: 'Red, Amber, Green, or N/I',
                  helperHints: ['ragColor'],
                },
                {
                  path: 'sections[].elementSections[].components[].additionalDescription',
                  type: 'string',
                  label: 'Additional Description',
                  description: 'Use {{this.additionalDescription}}',
                },
                {
                  path: 'sections[].elementSections[].components[].conditions',
                  type: 'array',
                  label: 'Conditions/Phrases',
                  description: 'Use with {{#each this.conditions}}',
                  children: [
                    {
                      path: 'sections[].elementSections[].components[].conditions[].id',
                      type: 'string',
                      label: 'Condition ID',
                      description: 'Use {{this.id}}',
                    },
                    {
                      path: 'sections[].elementSections[].components[].conditions[].name',
                      type: 'string',
                      label: 'Condition Name',
                      description: 'Use {{this.name}}',
                    },
                    {
                      path: 'sections[].elementSections[].components[].conditions[].phrase',
                      type: 'string',
                      label: 'Phrase Text',
                      description: 'Use {{this.phrase}}',
                    },
                  ],
                },
                {
                  path: 'sections[].elementSections[].components[].costings',
                  type: 'array',
                  label: 'Costings',
                  description: 'Use with {{#each this.costings}}',
                  children: [
                    {
                      path: 'sections[].elementSections[].components[].costings[].cost',
                      type: 'number',
                      label: 'Cost Amount',
                      description: 'Use {{this.cost}}',
                      helperHints: ['formatCurrency'],
                    },
                    {
                      path: 'sections[].elementSections[].components[].costings[].description',
                      type: 'string',
                      label: 'Cost Description',
                      description: 'Use {{this.description}}',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      path: 'owner',
      type: 'object',
      label: 'Survey Owner',
      children: [
        {
          path: 'owner.id',
          type: 'string',
          label: 'Owner ID',
        },
        {
          path: 'owner.name',
          type: 'string',
          label: 'Owner Name',
        },
        {
          path: 'owner.email',
          type: 'string',
          label: 'Owner Email',
        },
      ],
    },
    {
      path: 'status',
      type: 'string',
      label: 'Survey Status',
      description: 'draft, ready_for_qa, issued_to_client, or archived',
    },
  ];
}

/**
 * Get all leaf variables (non-object types) as a flat list
 */
export function getLeafVariables(): SchemaVariable[] {
  const leaves: SchemaVariable[] = [];

  const traverse = (variable: SchemaVariable) => {
    if (variable.children && variable.children.length > 0) {
      variable.children.forEach(traverse);
    } else {
      leaves.push(variable);
    }
  };

  parseSchema().forEach(traverse);
  return leaves;
}

/**
 * Search variables by path or label
 */
export function searchVariables(query: string): SchemaVariable[] {
  const lowerQuery = query.toLowerCase();
  const allVars = parseSchema();
  const results: SchemaVariable[] = [];

  const search = (variable: SchemaVariable, parent?: SchemaVariable) => {
    const matches =
      variable.path.toLowerCase().includes(lowerQuery) ||
      variable.label.toLowerCase().includes(lowerQuery) ||
      variable.description?.toLowerCase().includes(lowerQuery);

    if (matches) {
      results.push(variable);
    }

    if (variable.children) {
      variable.children.forEach(child => search(child, variable));
    }
  };

  allVars.forEach(v => search(v));
  return results;
}

