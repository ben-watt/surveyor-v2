/**
 * Heading Component
 * 
 * Semantic heading component that maintains consistent styling
 * and supports table of contents generation.
 * 
 * @example
 * ```tsx
 * <Heading id="section-1" level="h2" centered>
 *   Section Title
 * </Heading>
 * ```
 */

import React from 'react';
import { TableBlock } from './TableBlock';

export interface HeadingProps {
  id?: string;
  level?: 'h1' | 'h2';
  children: React.ReactNode;
  centered?: boolean;
  style?: React.CSSProperties;
}

/**
 * Semantic heading with consistent styling and TOC support
 */
export const Heading = ({ 
  id, 
  level = 'h2', 
  children, 
  centered = false,
  style: customStyle,
}: HeadingProps) => {
  const baseStyle: React.CSSProperties = {
    fontWeight: 'bold',
    fontSize: '14pt',
  };

  const style = centered
    ? { ...baseStyle, textAlign: 'center' as const, ...customStyle }
    : { ...baseStyle, ...customStyle };

  // H2 with centered layout and TOC support
  if (level === 'h2' && centered) {
    return (
      <TableBlock widths={[6, 88, 6]}>
        {id ? <p id={id} style={{ fontWeight: 'bold' }}></p> : <p></p>}
        <h2 data-add-toc-here-id={id} style={style}>
          {children}
        </h2>
        <p></p>
      </TableBlock>
    );
  }

  // Standard heading
  const Tag = level;
  return (
    <Tag id={id} style={style}>
      {children}
    </Tag>
  );
};

