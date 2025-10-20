/**
 * Legal section content for Building Survey Reports
 * Contains statutory items, planning guidance, and regulatory information
 */

export interface LegalItem {
  id: string;
  text: string;
  order: number;
}

export interface LegalSection {
  id: string;
  title: string;
  items?: readonly LegalItem[];
  content?: string;
}

/**
 * Statutory items that should be confirmed by legal advisor
 */
export const STATUTORY_ITEMS: readonly LegalItem[] = [
  {
    id: 'statutory-approvals',
    order: 1,
    text: 'Confirm all Statutory Approvals for all alteration and construction work. Obtain copies of all Approved Plans for any alterations or extensions to the property.',
  },
  {
    id: 'shared-services',
    order: 2,
    text: 'Any rights or responsibilities for the maintenance and upkeep of jointly used services including drainage, gutters, downpipes and chimneys should be established.',
  },
  {
    id: 'access-rights',
    order: 3,
    text: 'The right for you to enter the adjacent property to maintain any structure situated on or near the boundary and any similar rights your neighbour may have to enter onto your property.',
  },
  {
    id: 'maintenance-responsibilities',
    order: 4,
    text: 'Any responsibilities to maintain access roads and driveways, which may not be adopted by the Local Authority, should be established.',
  },
  {
    id: 'certificates-guarantees',
    order: 5,
    text: 'Obtain any certificates or guarantees, accompanying reports and plans for works that may have been carried out on the property. The guarantees should be formally assigned to you and preferably indemnified against eventualities such as contractors going out of business.',
  },
  {
    id: 'regulations-compliance',
    order: 6,
    text: 'Investigate if any fire, public health or other requirements or regulations are satisfied and that up-to-date certificates are available.',
  },
  {
    id: 'adjoining-land',
    order: 7,
    text: 'Investigate any proposed use of adjoining land and clarify the likelihood of any future type of development, which could adversely affect this property.',
  },
  {
    id: 'tree-damage',
    order: 8,
    text: 'Where there are trees in the adjacent gardens, which are growing sufficiently close to the property to cause possible damage, we would suggest that the owners are notified of the situation.',
  },
  {
    id: 'boundaries',
    order: 9,
    text: 'Whilst there were clearly defined physical boundaries to the site, these may not necessarily lie on the legal boundaries. These matters should be checked through your Solicitors.',
  },
  {
    id: 'tenure-confirmation',
    order: 10,
    text: 'The tenure is assumed to be Freehold, or Long Leasehold subject to nil or nominal Chief or Ground Rent. Your legal adviser should confirm all details.',
  },
  {
    id: 'services-connection',
    order: 11,
    text: 'Confirmation should be obtained that all main services are indeed connected. Confirmation should be obtained by the provision of service documentation, of when the electric and gas installations were last tested.',
  },
] as const;

/**
 * Planning and Building Regulations section content
 */
export const PLANNING_BUILDING_REGULATIONS_CONTENT = `As mentioned within the body of this report, we strongly recommend that you obtain certificates and warranties from the Vendor relating to the electrical and gas installations, extensions, etc. to confirm that all fully comply with the Building Regulations.`;

/**
 * Thermal Insulation & Energy Efficiency section content
 */
export const THERMAL_INSULATION_CONTENT = [
  `As part of the marketing process, current regulations require the provision of an Energy Performance Certificate. Legal enquiries are advised to confirm that such a Certificate has been obtained. This document provides the usual information regarding advice on energy efficiency and thermal improvement, which will assist in potentially reducing heating expenditure. The property is currently listed as achieving a rating of 58 (D), with the potential to achieve 78 (C). We recommend reviewing the EPC Certificate and considering making the improvements listed therein`,
  `From 1 April 2018, under the Minimum Energy Efficiency Standards (MEES) 2015, it became illegal to lease a property with an F or G Energy Performance Certificate Rating. In the residential market, the regulations extend to all properties with a valid EPC on 1 April 2020. This report does not provide extended advice on Minimum Energy Efficiency Standards (MEES) Regulations (2015) and is not designed to be used as evidence for the PRS Exemption Register. The responsibility for complying with MEES is allocated to the landlord and/or owner of the property.`,
] as const;

/**
 * All legal sections organized for easy iteration
 */
export const LEGAL_SECTIONS: readonly LegalSection[] = [
  {
    id: 'planning-building-regulations',
    title: 'Planning & Building Regulations',
    content: PLANNING_BUILDING_REGULATIONS_CONTENT,
  },
  {
    id: 'statutory',
    title: 'Statutory',
    items: STATUTORY_ITEMS,
  },
  {
    id: 'thermal-insulation-energy-efficiency',
    title: 'Thermal Insulation & Energy Efficiency',
  },
] as const;

