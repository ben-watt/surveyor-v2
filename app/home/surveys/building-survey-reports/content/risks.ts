/**
 * Risk definitions for Building Survey Reports
 * Categorized as: building, grounds, or people risks
 */

export interface RiskDefinition {
  id: string;
  category: 'building' | 'grounds' | 'people';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Building-related risks
 */
export const BUILDING_RISKS: Record<string, RiskDefinition> = {
  'timber-rot': {
    id: 'timber-rot',
    category: 'building',
    title: 'Timber rot and insect damage',
    description: `We have been unable to assess the condition of all timber elements and walls of the property due to furniture and building fabric obstructing our view and we are therefore unable to confirm that these areas are free from damp, rot, or insect infestation. Given the lack of and obstructed air vents serving the subfloor void, there is a risk that concealed areas are decayed and should be investigated further.`,
    severity: 'medium',
  },
  'tree-proximity': {
    id: 'tree-proximity',
    category: 'building',
    title: 'Tree proximity',
    description: `The presence of mature trees near a building can cause structural damage to foundations by directly displacing them, decreasing, or indeed increasing, the amount of moisture to be drawn from the certain types of soil causing it to shrink and expand, as well as negatively affecting drainage causing subsidence. The risk posed is subject to the following:
* Proximity of the tree * the height, age and species of the tree *the design and depth of the building's foundations *the type of sub-soil
A mature tree is present in the rear garden, located close to the raised patio. The tree could be contributing to the movement observed in the wall. However, there was no evidence to suggest that this is causing any structural issues to the property.`,
    severity: 'low',
  },
  'flood-risk': {
    id: 'flood-risk',
    category: 'building',
    title: 'Flood Risk',
    description: `We have not undertaken detailed investigations into the potential for flooding of the land on which the property lies. However, we have consulted the Environmental Agency website at www.environment-agency.gov.uk and their information regarding the potential for flooding identifies the site as being at very low flood risk from surface water and very-low flood risk from rivers or the sea. For more information, please visit https://check-long-term-flood-risk.service.gov.uk/risk.
The property owner should stay informed about local flood alerts and maintain regular communication with relevant authorities. Given the high risk of surface water flooding, you should ensure that your insurance policy covers for flood damage and expect to pay higher premiums in light of this information.`,
    severity: 'medium',
  },
} as const;

/**
 * Grounds-related risks
 */
export const GROUNDS_RISKS: Record<string, RiskDefinition> = {
  'invasive-species': {
    id: 'invasive-species',
    category: 'grounds',
    title: 'Invasive species',
    description: `None noted at the time of inspection.`,
    severity: 'low',
  },
} as const;

/**
 * People-related risks (health and safety)
 */
export const PEOPLE_RISKS: Record<string, RiskDefinition> = {
  asbestos: {
    id: 'asbestos',
    category: 'people',
    title: 'Asbestos',
    description: `Given the age of the property, there is a likelihood that there are areas of ACMs within the property which have been concealed. Under the Control of Asbestos Regulations 2012, you are required to commission a Refurbishment and Demolition (R&D) Asbestos survey before commencing any refurbishment works.`,
    severity: 'high',
  },
  'radon-risk': {
    id: 'radon-risk',
    category: 'people',
    title: 'Radon risk',
    description: `Radon is a naturally occurring radioactive gas that can accumulate in buildings. The UK Health Security Agency provides information on radon risk areas. We recommend consulting their website and considering a radon test if the property is in a designated radon affected area. This is particularly important for properties with basements or ground floor living spaces.`,
    severity: 'medium',
  },
  'electromagnetic-fields': {
    id: 'electromagnetic-fields',
    category: 'people',
    title: 'Electromagnetic fields',
    description: `During our inspection, we did not note the presence of any mobile phone transmission masts affixed to either the land or surrounding buildings. There is concern that electromagnetic fields from both natural and artificial sources can cause a wide range of illnesses such as blackouts, insomnia and headaches to depression, allergies and cancer. Artificial sources commonly comprise overhead or subterranean high voltage electrical power cables. It is suggested that the electrical discharges from these high voltage cables upset the balance of minute electrical impulses employed by the human body to regulate itself in much the same way as television and radio signals can be disrupted. This subject is still largely controversial with further scientific research required. Further information on this matter can be found on the National Radiological Protection Board's website. We have not undertaken any separate inquiries with the relevant statutory authority.`,
    severity: 'low',
  },
} as const;

/**
 * All risks combined for easy iteration
 */
export const ALL_RISKS: Record<string, RiskDefinition> = {
  ...BUILDING_RISKS,
  ...GROUNDS_RISKS,
  ...PEOPLE_RISKS,
} as const;

/**
 * Helper to get risks by category
 */
export const getRisksByCategory = (category: RiskDefinition['category']): RiskDefinition[] => {
  return Object.values(ALL_RISKS).filter(risk => risk.category === category);
};

