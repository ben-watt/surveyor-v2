/**
 * Limitations and scope of service content for Building Survey Reports
 * Defines what was and was not included in the inspection
 */

export interface LimitationItem {
  id: string;
  text: string;
  order: number;
}

/**
 * Main limitations of the building survey inspection
 */
export const LIMITATION_ITEMS: readonly LimitationItem[] = [
  {
    id: 'general-standard',
    order: 1,
    text: 'Our Report concentrates on the general standard and condition of the building and any principal defects or shortcomings and is not intended to be a report listing all items of repair, redecoration or reinstatement works.',
  },
  {
    id: 'visual-inspection',
    order: 2,
    text: 'This report is based on a visual inspection of the readily accessible areas of the property only and in accordance with the limitations contained in our Scope of Service provided previously. No steps were taken to expose elements of the structure otherwise concealed or to remove surface finishes for the examination of underlying elements. As such, we are unable to confirm that inaccessible and concealed parts of the property are free from defects.',
  },
  {
    id: 'specialist-surveys',
    order: 3,
    text: 'We were not instructed to make arrangements for specialist surveys of the drainage installations, the water distribution systems, the mechanical systems or the electrical systems or for these to be tested by a specialist. We have, however, made recommendations where we believe that tests should be carried out and made a brief comment where something has been found from a visual inspection to be obviously defective.',
  },
  {
    id: 'structural-assessment',
    order: 4,
    text: 'We have not been instructed to organise a structural assessment to determine floor loadings.',
  },
  {
    id: 'electrical-capacity',
    order: 5,
    text: 'We have not been instructed to establish the capacity of the electrical incoming supply nor to ascertain whether any other live services are connected to the premises.',
  },
  {
    id: 'geological-survey',
    order: 6,
    text: 'We have not carried out any geological survey or site investigation and cannot confirm the nature or characteristics of the soil with regards to fill or possible contamination. Normal legal searches should confirm the past use of the site and if instructed, we will advise further.',
  },
  {
    id: 'roof-examination',
    order: 7,
    text: 'Our examination of the roof covering and roof features such as chimneys, skylights, etc. were confined to an inspection from ground level',
  },
  {
    id: 'works-costs',
    order: 8,
    text: "Subject to the client's requirements, they may not wish to proceed with all works, but do so that their own risk. The list of works is by no means exhaustive. The works listed are considered necessary to prevent further deterioration of the property. Further investigations may reveal additional works and thus greater expenditure. The costs are subject to a competitively sought tender process and are intended for budgeting purposes only. All costs provided are exclusive of VAT, professional fees and access unless expressly stated.",
  },
] as const;

/**
 * Important inspection notes that explain methodology
 */
export const IMPORTANT_NOTES: readonly string[] = [
  'We carry out a desktop study and make oral enquiries for information about matters affecting the property. We carefully and thoroughly inspect the property using our best endeavours to see as much of it as is physically accessible. Where this is not possible an explanation will be provided.',
  'We visually inspect roofs, chimneys and other surfaces on the outside of the building from ground level and, if necessary, from neighbouring public property and with the help of binoculars. Flat roofs no more than 3m above ground level are inspected using a ladder where it is safe to do so. We inspect the roof structure from inside the roof space if there is safe access.',
  'We examine floor surfaces and under-floor spaces so far as there is safe access and permission from the owner. We are not able to assess the condition of the inside of any chimney, boiler or other flues. We do not lift fitted carpets or coverings without the owner\'s consent. Intermittent faults of services may not be apparent on the day of inspection.',
  'If we are concerned about parts of the property that the inspection cannot cover, the report will tell you about any further investigations that are needed. Where practicable and agreed we report on the cost of any work for identified repairs and make recommendations on how these repairs should be carried out. Some maintenance and repairs we suggest may be expensive. Purely cosmetic and minor maintenance defects that do not affect performance might not be reported. The report that we provide is not a warranty.',
] as const;

/**
 * Get limitation text for a specific client name
 */
export const getClientSpecificLimitation = (clientName: string): string => {
  return `This Report has been prepared for the sole use of ${clientName}.`;
};

