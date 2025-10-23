/**
 * Constants and style definitions for building survey reports
 * 
 * Centralizes all magic numbers, dimensions, and repeated styles
 * to ensure consistency across reports and simplify maintenance.
 */

// Layout constants
export const LANDSCAPE_WIDTH = 928; // Width of the page in landscape mode (pixels)
export const IMAGE_MAX_HEIGHT = '75mm'; // Maximum height for inline images
export const FRONT_ELEVATION_MAX_HEIGHT = '75mm'; // Maximum height for front elevation images
export const SIGNATURE_HEIGHT = '30mm'; // Height for signature images

/**
 * Report style constants
 * All inline styles should reference these constants for consistency
 */
export const REPORT_STYLES = {
  // Headings
  heading1: {
    fontSize: '14pt',
    fontWeight: 'bold' as const,
  },
  heading2: {
    fontSize: '14pt',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  heading3: {
    fontWeight: 'bold' as const,
  },

  // Text alignment
  rightAligned: {
    textAlign: 'right' as const,
  },
  centered: {
    textAlign: 'center' as const,
  },
  justified: {
    textAlign: 'justify' as const,
  },

  // Font sizes
  smallText: {
    fontSize: '8pt',
  },
  tinyText: {
    fontSize: '6pt',
  },
  largeText: {
    fontSize: '18pt',
  },

  // Combined styles
  rightAlignedSmall: {
    textAlign: 'right' as const,
    fontSize: '8pt',
  },
  markerText: {
    fontSize: '18pt',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  ragMarker: {
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    fontSize: '18pt',
  },

  // Image styles
  centeredImage: {
    margin: '0 auto',
  },
  locationPlanImage: {
    margin: '0 auto',
    width: '175mm',
  },
} as const;

/**
 * RAG (Red/Amber/Green) status color mapping
 * Used for visual indicators in condition sections
 */
export const RAG_COLORS: Record<string, string> = {
  Green: 'green',
  Amber: 'orange',
  Red: 'red',
  'N/I': 'white',
} as const;

/**
 * Table width configurations for common layouts
 * Percentages must add up to 100
 */
export const TABLE_LAYOUTS = {
  twoColumnEqual: [50, 50] as const,
  twoColumnUnequal: [40, 60] as const,
  twoColumnNarrowLeft: [30, 70] as const,
  threeColumnCentered: [6, 88, 6] as const,
  fourColumnReport: [10, 20, 64, 6] as const,
  fourColumnEqual: [25, 25, 25, 25] as const,
  twoColumnLabelValue: [6, 94] as const,
  coverPageLayout: [55, 45] as const,
} as const;

/**
 * Image dimensions for report elements
 */
export const IMAGE_DIMENSIONS = {
  moneyShot: {
    width: 700,
    height: 480,
  },
  placeholder: {
    width: 600,
    height: 400,
  },
  signature: {
    width: 400,
    height: 200,
  },
  typicalHouse: {
    width: 800,
  },
} as const;

