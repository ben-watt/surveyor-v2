/**
 * RiskRow Component
 * 
 * Displays a risk item in a standardized table layout.
 * Used in the Risks section of building survey reports.
 * 
 * @example
 * ```tsx
 * <RiskRow
 *   id="timber-rot"
 *   risk="Timber rot and insect damage"
 *   description="We have been unable to assess..."
 * />
 * ```
 */

import React from 'react';
import { TableBlock } from './TableBlock';

export interface RiskRowProps {
  id: string;
  risk: string;
  description?: string;
  reportStyles?: {
    justified?: React.CSSProperties;
  };
}

/**
 * Displays a single risk item with ID, title, and description in a 4-column layout
 */
export const RiskRow = ({ id, risk, description, reportStyles }: RiskRowProps) => {
  const justifiedStyle = reportStyles?.justified || { textAlign: 'justify' as const };

  return (
    <TableBlock widths={[10, 20, 64, 6]}>
      <p id={id}></p>
      <h3 data-add-toc-here-id={id}>{risk}</h3>
      <p style={justifiedStyle}>{description}</p>
      <p></p>
    </TableBlock>
  );
};

