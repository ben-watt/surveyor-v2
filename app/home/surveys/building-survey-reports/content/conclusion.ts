/**
 * Conclusion content for Building Survey Reports
 * Note: These are template paragraphs that may need customization per report
 */

export interface ConclusionParagraph {
  id: string;
  text: string;
  order: number;
}

/**
 * Standard conclusion paragraphs
 * Note: In a future version, these should be customizable per report
 * or generated based on survey findings
 */
export const CONCLUSION_PARAGRAPHS: readonly ConclusionParagraph[] = [
  {
    id: 'structural-condition',
    order: 1,
    text: 'The property is in sound structural condition with no significant structural defects noted.',
  },
  {
    id: 'external-repairs',
    order: 2,
    text: 'External repairs were identified which have generally resulted from a lack of maintenance and ill-conceived repairs. These include slipped and damaged roof tiles, aged and poorly installed lead flashings, cement render to presumed solid masonry walls and a lack of air vents to the original subfloor void.. These issues need to be addressed to ensure the longevity of the property and to prevent more costly repairs in the long term.',
  },
  {
    id: 'internal-condition',
    order: 3,
    text: 'Internally, the property exhibits reasonable condition. We noted that chimney breasts would benefit from having air vents installed.',
  },
  {
    id: 'certificates-recommendation',
    order: 4,
    text: "We recommend that you obtain all testing and commissioning certificates relating to the electrical and gas installations etc. and obtain Final Certificates and engineer's calculations for the structural alterations and extensions to confirm that they were designed and installed in compliance with the Building Regulations.",
  },
  {
    id: 'drainage-recommendation',
    order: 5,
    text: 'Furthermore, we recommend a CCTV drainage survey to ascertain the condition of the underground drainage pipework and the septic tank.',
  },
  {
    id: 'financial-considerations',
    order: 6,
    text: 'The property should remain in reasonable condition should all repairs recommended be undertaken, however, you should fully consider the financial implications associated with the repairs identified before proceeding with the purchase of the property.',
  },
  {
    id: 'legal-review',
    order: 7,
    text: 'We recommend that your solicitor reviews legal information and information returned from local searches to ascertain whether there are any elements of concern.',
  },
] as const;

/**
 * Closing statement for conclusion section
 */
export const CONCLUSION_CLOSING = 'We trust this Report is satisfactory for your present requirements and if you wish to discuss matters further, please contact:';

