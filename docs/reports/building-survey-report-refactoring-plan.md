---
title: "Building Survey Report Refactoring Plan (Archived)"
status: archived
category: reports
created: 2025-09-01
updated: 2025-11-24
tags: [refactoring, reports, archived]
related: [./building-survey-report-refactoring.md]
---

# Building Survey Report Refactoring Plan

> **⚠️ ARCHIVED DOCUMENT**  
> This document has been superseded by [building-survey-report-refactoring.md](./building-survey-report-refactoring.md)  
> 
> **Status:** Phases 1, 2, and 3 are complete ✅  
> All information has been consolidated into the main refactoring document.
>
> This file is kept for historical reference only.

---

**Original Planning Document Below (Archived)**

---

## Overview

This document outlines an incremental refactoring strategy for `BuildingSurveyReportTipTap.tsx` that moves toward the templated report system described in [survey-report-templates-proposal.md](./survey-report-templates-proposal.md).

**Key Principle:** Refactor incrementally without breaking existing functionality. Each phase delivers value and can be deployed independently.

---

## Current State Assessment

### File Stats
- **Lines of Code:** 1,020 lines
- **Hard-coded Content:** ~400 lines of static text (legal, risks, definitions, limitations)
- **Organization-specific Details:** Embedded throughout (Clarke & Watt branding, address, contact info)
- **Reusable Primitives:** 4 components locked in this file (`TableBlock`, `Page`, `H2`, `RiskRow`)

### Critical Issues

#### 🔴 High Priority
1. **Hard-coded organization details** (lines 202-216)
   ```tsx
   <p style={{ textAlign: 'right' }}>Clarke & Watt Building Consultancy Ltd</p>
   <p style={{ textAlign: 'right' }}>Suite D</p>
   <p style={{ textAlign: 'right' }}>The Towers</p>
   ```
   *Impact:* Blocks multi-tenant usage; requires code changes for rebrand

2. **Duplicate content bug** (lines 665-667)
   ```tsx
   // Radon risk section incorrectly uses asbestos description
   description={`Given the age of the property, there is a likelihood that there are areas of ACMs...`}
   ```

3. **Repeated inline styles**
   ```tsx
   // Appears 20+ times
   style={{ fontSize: '14pt', fontWeight: 'bold' }}
   ```

#### 🟠 Medium Priority
4. **No template versioning** - Can't track which template version generated a report
5. **Primitive components not reusable** - Locked to this file
6. **Complex data access patterns** - Nested optional chaining prone to runtime errors

#### 🟡 Lower Priority
7. **No localization support**
8. **Testing challenges** - Monolithic component difficult to test in isolation
9. **No validation of data bindings** until render time

---

## Refactoring Roadmap

### Phase 1: Quick Wins (1-2 days)
*Low risk, immediate value, no architectural changes*

#### 1.1 Extract Constants
**File:** `app/home/surveys/building-survey-reports/constants.ts`

```typescript
// Layout constants
export const LANDSCAPE_WIDTH = 928;
export const IMAGE_MAX_HEIGHT = '75mm';
export const FRONT_ELEVATION_MAX_HEIGHT = '75mm';

// Style constants
export const REPORT_STYLES = {
  heading1: { fontSize: '14pt', fontWeight: 'bold' },
  heading2: { fontSize: '14pt', fontWeight: 'bold', textAlign: 'center' as const },
  bodyJustified: { textAlign: 'justify' as const },
  rightAligned: { textAlign: 'right' as const },
  centered: { textAlign: 'center' as const },
  smallText: { fontSize: '8pt' },
  markerText: { fontSize: '18pt', fontWeight: 'bold' as const, textAlign: 'center' as const },
} as const;

// RAG status colors
export const RAG_COLORS: Record<string, string> = {
  'Green': 'green',
  'Amber': 'orange',
  'Red': 'red',
  'N/I': 'white',
} as const;
```

**Usage Example:**
```tsx
// Before
<h1 style={{ fontSize: '14pt', fontWeight: 'bold' }}>Title</h1>

// After
import { REPORT_STYLES } from './constants';
<h1 style={REPORT_STYLES.heading1}>Title</h1>
```

**Impact:** Reduces duplication, makes style changes easier, improves consistency

---

#### 1.2 Extract Organization Configuration
**File:** `app/home/surveys/building-survey-reports/org-config.ts`

```typescript
/**
 * Organization-specific configuration for report branding.
 * TODO: Move to database/tenant configuration in Phase 4
 */
export interface OrganizationConfig {
  name: string;
  legalName: string;
  address: {
    suite?: string;
    building: string;
    street?: string;
    city: string;
    postcode: string;
  };
  contact: {
    email: string;
    phone?: string;
    website?: string;
  };
  branding: {
    logoPath?: string;
    primaryColor?: string;
  };
}

export const DEFAULT_ORG_CONFIG: OrganizationConfig = {
  name: 'Clarke & Watt Building Consultancy',
  legalName: 'Clarke & Watt Building Consultancy Ltd',
  address: {
    suite: 'Suite D',
    building: 'The Towers',
    street: 'Towers Business Park, Wilmslow Road',
    city: 'Manchester',
    postcode: 'M20 2RY',
  },
  contact: {
    email: 'admin@cwbc.co.uk',
  },
  branding: {},
};

// Helper function
export const formatOrgAddress = (config: OrganizationConfig): string[] => {
  const { address } = config;
  return [
    address.suite,
    address.building,
    address.street,
    address.city,
    address.postcode,
  ].filter(Boolean) as string[];
};
```

**Usage Example:**
```tsx
// Before
<p style={{ textAlign: 'right' }}>Clarke & Watt Building Consultancy Ltd</p>
<p style={{ textAlign: 'right' }}>Suite D</p>
<p style={{ textAlign: 'right' }}>The Towers</p>

// After
import { DEFAULT_ORG_CONFIG, formatOrgAddress } from './org-config';
{formatOrgAddress(DEFAULT_ORG_CONFIG).map(line => (
  <p key={line} style={REPORT_STYLES.rightAligned}>{line}</p>
))}
```

---

#### 1.3 Create Utility Functions
**File:** `app/home/surveys/building-survey-reports/utils.ts`

```typescript
import type { RagStatus } from './BuildingSurveyReportSchema';
import { RAG_COLORS } from './constants';

/**
 * Maps RAG status to background color for report rendering
 */
export const mapRagToColor = (ragStatus: RagStatus): string => {
  return RAG_COLORS[ragStatus] ?? RAG_COLORS['N/I'];
};

/**
 * Safe fallback helper with type safety
 */
export const fallback = <T>(value: T | undefined | null, fallbackValue: T): T => {
  if (value === undefined || value === null) return fallbackValue;

  switch (typeof value) {
    case 'string':
      return value.length > 0 ? value : fallbackValue;
    case 'number':
      return value === 0 ? value : fallbackValue;
    case 'boolean':
      return value;
    default:
      return fallbackValue;
  }
};

/**
 * Formats an array for display with proper separators
 */
export const formatList = (items: any[], separator: string = ' & '): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return String(items[0]);
  return items.slice(0, -1).join(', ') + separator + items[items.length - 1];
};
```

---

#### 1.4 Fix Content Bugs

**Issues to Fix:**
1. Radon risk description duplicates asbestos text (line 665-667)
2. Inconsistent spacing in TableBlock usage
3. Missing alt text on some images

**Action:** Create a content review checklist and fix in place.

---

### Phase 2: Extract Static Content (3-5 days)
*Separate content from code, enable easy content updates*

#### 2.1 Content Structure
**Directory:** `app/home/surveys/building-survey-reports/content/`

```
content/
├── index.ts
├── definitions.ts       # Key, glossary, crack definitions
├── legal-sections.ts    # Planning, statutory, thermal
├── risks.ts            # All risk descriptions
├── limitations.ts      # Appendix content
└── conclusion.ts       # Conclusion paragraphs
```

#### 2.2 Example: Risk Definitions
**File:** `content/risks.ts`

```typescript
export interface RiskDefinition {
  id: string;
  category: 'building' | 'grounds' | 'people';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  templateVariables?: string[]; // e.g., ['propertyAge', 'location']
}

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
* Proximity of the tree
* The height, age and species of the tree
* The design and depth of the building's foundations
* The type of sub-soil

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
  'invasive-species': {
    id: 'invasive-species',
    category: 'grounds',
    title: 'Invasive species',
    description: 'None noted at the time of inspection.',
    severity: 'low',
  },
  'asbestos': {
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
};

// Helper to get risks by category
export const getRisksByCategory = (category: RiskDefinition['category']) => {
  return Object.values(BUILDING_RISKS).filter(risk => risk.category === category);
};
```

**Usage Example:**
```tsx
// Before
<RiskRow
  id={'timber-rot'}
  risk={'Timber rot and insect damage'}
  description={`We have been unable to assess...`}
/>

// After
import { BUILDING_RISKS } from './content/risks';

{Object.values(BUILDING_RISKS)
  .filter(r => r.category === 'building')
  .map(risk => (
    <RiskRow
      key={risk.id}
      id={risk.id}
      risk={risk.title}
      description={risk.description}
    />
  ))}
```

#### 2.3 Example: Legal Sections
**File:** `content/legal-sections.ts`

```typescript
export interface LegalItem {
  id: string;
  text: string;
  order: number;
}

export interface LegalSection {
  id: string;
  title: string;
  items: LegalItem[];
}

export const STATUTORY_ITEMS: LegalItem[] = [
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
];

export const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: 'planning-building-regulations',
    title: 'Planning & Building Regulations',
    items: [], // Handled separately with custom content
  },
  {
    id: 'statutory',
    title: 'Statutory',
    items: STATUTORY_ITEMS,
  },
  {
    id: 'thermal-insulation-energy-efficiency',
    title: 'Thermal Insulation & Energy Efficiency',
    items: [], // Handled separately with custom content
  },
];
```

#### 2.4 Example: Definitions
**File:** `content/definitions.ts`

```typescript
export interface RagKeyItem {
  color: 'green' | 'orange' | 'red';
  description: string;
}

export const RAG_KEY: RagKeyItem[] = [
  {
    color: 'green',
    description: 'For information purposes, generally, no repair is required. Property to be maintained as usual.',
  },
  {
    color: 'orange',
    description: 'Defects requiring repair/replacement but not considered urgent nor serious. Property to be maintained as usual.',
  },
  {
    color: 'red',
    description: 'Serious defects to be fully considered prior to purchase that need to be repaired, replace or investigated urgently.',
  },
];

export interface TimeframeDefinition {
  term: string;
  description: string;
}

export const TIMEFRAME_GLOSSARY: TimeframeDefinition[] = [
  { term: 'Immediate', description: 'Within 1 year' },
  { term: 'Short Term', description: 'Within the next 1 to 3 years' },
  { term: 'Medium Term', description: 'Within the next 4 to 10 years' },
  { term: 'Long Term', description: 'Within the next 10 years' },
];

export interface CrackCategory {
  category: number;
  severity: string;
  width: string;
}

export const CRACK_DEFINITIONS: CrackCategory[] = [
  { category: 0, severity: 'Negligible', width: '< 0.1mm' },
  { category: 1, severity: 'Very slight', width: 'Up to 1mm' },
  { category: 2, severity: 'Slight', width: 'Up to 5mm' },
  { category: 3, severity: 'Moderate', width: '5 - 15mm' },
  { category: 4, severity: 'Severe', width: '15 - 25mm' },
  { category: 5, severity: 'Very severe', width: '> 25mm' },
];
```

**Impact:** Content changes no longer require code deployment, easier to maintain consistency, enables future CMS integration

---

### Phase 3: Extract Reusable Primitives (1 week)
*Make components reusable across multiple report types*

#### 3.1 Directory Structure
```
app/home/surveys/report-primitives/
├── components/
│   ├── TableBlock.tsx
│   ├── Page.tsx
│   ├── Heading.tsx
│   ├── RiskRow.tsx
│   ├── ImageGrid.tsx
│   ├── LegalSection.tsx
│   └── index.ts
├── types.ts
└── index.ts
```

#### 3.2 Enhanced TableBlock Component
**File:** `report-primitives/components/TableBlock.tsx`

```typescript
import React, { isValidElement } from 'react';

export interface TableBlockProps {
  children: React.ReactNode;
  widths: number[];
  landscapeWidth?: number;
}

/**
 * Creates a table with specified column widths.
 * Automatically chunks children into rows based on widths array.
 * 
 * @example
 * <TableBlock widths={[30, 70]}>
 *   <p>Label</p>
 *   <p>Value</p>
 *   <p>Another Label</p>
 *   <p>Another Value</p>
 * </TableBlock>
 */
export const TableBlock = ({
  children,
  widths,
  landscapeWidth = 928,
}: TableBlockProps) => {
  // Validate widths sum to 100
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  if (totalWidth !== 100) {
    console.error(
      `[TableBlock] Width total is ${totalWidth}%, expected 100%`,
      { widths }
    );
  }

  // Validate children exist
  if (children === null || children === undefined) {
    console.error('[TableBlock] Children must not be null or undefined');
    return null;
  }

  const createTableRows = (elements: React.ReactNode): React.JSX.Element[] => {
    const elementsArr = React.Children.toArray(elements);
    const columnsPerRow = widths.length;

    if (elementsArr.length % columnsPerRow !== 0) {
      console.warn(
        '[TableBlock] Number of children should be a multiple of column count',
        {
          childCount: elementsArr.length,
          columns: columnsPerRow,
          widths,
        }
      );
    }

    const tableRows: React.JSX.Element[] = [];

    for (let i = 0; i < elementsArr.length; i += columnsPerRow) {
      const firstChildInRow = elementsArr[i];

      // Handle React Fragments
      if (isValidElement(firstChildInRow) && firstChildInRow.type === React.Fragment) {
        const fragmentChildren = (
          firstChildInRow as React.ReactElement<{ children: React.ReactNode }>
        ).props.children;
        tableRows.push(...createTableRows(fragmentChildren));
        i -= columnsPerRow - 1;
        continue;
      }

      // Create row cells
      const cells = widths.map((width, colIndex) => {
        const child = elementsArr[i + colIndex];
        const colWidth = Math.round(landscapeWidth * (width / 100));

        return (
          <td key={colIndex} colwidth={String(colWidth)}>
            {child}
          </td>
        );
      });

      tableRows.push(<tr key={i}>{cells}</tr>);
    }

    return tableRows;
  };

  return (
    <table>
      <tbody>{createTableRows(children)}</tbody>
    </table>
  );
};
```

#### 3.3 Semantic Heading Component
**File:** `report-primitives/components/Heading.tsx`

```typescript
import React from 'react';
import { TableBlock } from './TableBlock';

export interface HeadingProps {
  id?: string;
  level: 'h1' | 'h2';
  children: React.ReactNode;
  centered?: boolean;
}

/**
 * Semantic heading component that maintains consistent styling
 * and supports table of contents generation.
 */
export const Heading = ({ id, level, children, centered = false }: HeadingProps) => {
  const baseStyle = {
    fontWeight: 'bold' as const,
    fontSize: '14pt',
  };

  const style = centered
    ? { ...baseStyle, textAlign: 'center' as const }
    : baseStyle;

  if (level === 'h2' && centered) {
    // H2 with TOC support
    return (
      <TableBlock widths={[6, 88, 6]}>
        {id && <p id={id} style={{ fontWeight: 'bold' }}></p>}
        {!id && <p></p>}
        <h2 data-add-toc-here-id={id} style={style}>
          {children}
        </h2>
        <p></p>
      </TableBlock>
    );
  }

  const Tag = level;
  return <Tag id={id} style={style}>{children}</Tag>;
};
```

#### 3.4 Page Component
**File:** `report-primitives/components/Page.tsx`

```typescript
import React from 'react';

export interface PageProps {
  children: React.ReactNode;
  pageBreak?: 'always' | 'avoid' | 'auto';
}

/**
 * Represents a single page in the report.
 * Automatically adds page break separator.
 */
export const Page = ({ children, pageBreak = 'always' }: PageProps) => (
  <>
    {children}
    <hr />
  </>
);
```

**Impact:** Enables code reuse across multiple report types, easier testing, cleaner separation of concerns

---

### Phase 4: Data Binding Strategies
*Enable declarative data access with validation*

#### Option A: Path-based String Accessors (Simplest)

```typescript
// File: report-primitives/bindings.ts
import type { BuildingSurveyReportTipTap } from '../building-survey-reports/BuildingSurveyReportSchema';

export type DataPath = string; // e.g., "reportDetails.clientName"

export interface BindingOptions {
  fallback?: any;
  transform?: (value: any) => any;
  required?: boolean;
}

/**
 * Safely access nested data using dot-notation path strings
 */
export const bindData = <T = any>(
  form: BuildingSurveyReportTipTap,
  path: DataPath,
  options: BindingOptions = {}
): T | undefined => {
  const { fallback, transform, required = false } = options;

  try {
    const value = path.split('.').reduce((obj: any, key: string) => {
      // Handle array access: sections[0]
      const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        return obj?.[arrayKey]?.[parseInt(index)];
      }
      return obj?.[key];
    }, form);

    if (value === undefined || value === null) {
      if (required) {
        console.warn(`[Binding] Required field "${path}" is missing`);
      }
      return fallback;
    }

    return transform ? transform(value) : value;
  } catch (error) {
    console.error(`[Binding] Error accessing path "${path}"`, error);
    return fallback;
  }
};

// Usage example:
const clientName = bindData(form, 'reportDetails.clientName', {
  fallback: 'Client Name Not Provided',
  required: true,
});
```

**Pros:**
- Simple to implement
- Flexible path syntax
- Easy to understand
- Minimal dependencies

**Cons:**
- No compile-time type safety
- Typos discovered at runtime
- No autocomplete in IDE

---

#### Option B: Type-safe Getter Functions (Recommended)

```typescript
// File: report-primitives/bindings.ts
import type { BuildingSurveyReportTipTap } from '../building-survey-reports/BuildingSurveyReportSchema';

/**
 * Type-safe getter functions for common data access patterns
 */
export const createDataBindings = (form: BuildingSurveyReportTipTap) => ({
  // Report details
  getClientName: (fallback = 'Client Name Not Provided') =>
    form.reportDetails.clientName || fallback,

  getAddress: () => form.reportDetails.address,

  getReportDate: () => new Date(form.reportDetails.reportDate),

  getInspectionDate: () => new Date(form.reportDetails.inspectionDate),

  getLevel: () => form.reportDetails.level,

  // Property description
  getPropertyType: () => form.propertyDescription.propertyType,

  getYearOfConstruction: () => form.propertyDescription.yearOfConstruction,

  // Images
  getMoneyShot: () => form.reportDetails.moneyShot[0],

  getFrontElevationImages: () => form.reportDetails.frontElevationImagesUri,

  // Owner details
  getOwnerName: () => form.owner.name,

  getOwnerEmail: () => form.owner.email,

  getOwnerSignature: () => form.owner.signaturePath[0],

  // Sections
  getSections: () => form.sections,

  getSectionByName: (name: string) =>
    form.sections.find(s => s.name === name),

  // Conditional rendering helpers
  isLevel3: () => form.reportDetails.level === '3',

  hasExtensions: () => Boolean(form.propertyDescription.yearOfExtensions),
});

// Usage example:
const data = createDataBindings(form);
const clientName = data.getClientName();
const isLevel3 = data.isLevel3();
```

**Pros:**
- Full type safety
- IDE autocomplete
- Centralized data access logic
- Easy to add computed properties
- Catch errors at compile time

**Cons:**
- Need to add new getters for new fields
- Less flexible than path strings
- More boilerplate code

---

#### Option C: Proxy-based Type-safe Paths (Advanced)

```typescript
// File: report-primitives/bindings.ts
type PathImpl<T, Key extends keyof T> = Key extends string
  ? T[Key] extends Record<string, any>
    ? `${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof any[]>> & string}` | `${Key}`
    : `${Key}`
  : never;

type Path<T> = PathImpl<T, keyof T> | keyof T;

type PathValue<T, P extends Path<T>> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * Type-safe path accessor using TypeScript template literals
 */
export const get = <T, P extends Path<T>>(
  obj: T,
  path: P
): PathValue<T, P> | undefined => {
  const keys = (path as string).split('.');
  let result: any = obj;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) break;
  }

  return result;
};

// Usage example:
const clientName = get(form, 'reportDetails.clientName'); // Type-safe!
const invalid = get(form, 'reportDetails.invalidField'); // TypeScript error!
```

**Pros:**
- Type-safe paths
- Flexible like Option A
- IDE autocomplete on paths
- No manual getter definitions

**Cons:**
- Complex TypeScript types
- May have performance implications
- Harder to debug
- Limited support for arrays

---

#### Option D: Validation Schema Approach

```typescript
// File: report-primitives/validation.ts
import { z } from 'zod';

/**
 * Define validation schema that doubles as documentation
 * and runtime validation
 */
export const ReportBindingSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    postcode: z.string(),
  }),
  reportDate: z.coerce.date(),
  level: z.enum(['2', '3']),
  moneyShot: z.array(z.object({
    uri: z.string(),
  })).min(1, 'Money shot image required'),
});

/**
 * Validate and extract required data for template rendering
 */
export const validateBindings = (form: BuildingSurveyReportTipTap) => {
  const result = ReportBindingSchema.safeParse({
    clientName: form.reportDetails.clientName,
    address: form.reportDetails.address,
    reportDate: form.reportDetails.reportDate,
    level: form.reportDetails.level,
    moneyShot: form.reportDetails.moneyShot,
  });

  if (!result.success) {
    console.error('[Validation] Binding validation failed:', result.error);
    return { valid: false, errors: result.error.errors };
  }

  return { valid: true, data: result.data };
};
```

**Pros:**
- Runtime validation catches missing data
- Schema serves as documentation
- Can be used for form validation too
- Clear error messages

**Cons:**
- Requires Zod dependency
- Need to define schema separately
- Extra validation overhead

---

#### Recommended Approach: Hybrid

Use **Option B (Type-safe getters)** for Phase 4, then migrate to **Option C or D** in later phases when template descriptor system is built.

```typescript
// Phase 4: Use type-safe getters
const data = createDataBindings(form);
<p>{data.getClientName()}</p>

// Phase 5+: Use with template descriptor
{
  type: 'text',
  binding: (data) => data.getClientName(),
  fallback: 'Client Name Not Provided',
}
```

---

## Implementation Priority

### Week 1: Quick Wins
- [ ] Extract constants (1.1)
- [ ] Extract organization config (1.2)
- [ ] Create utility functions (1.3)
- [ ] Fix content bugs (1.4)
- [ ] Update `BuildingSurveyReportTipTap.tsx` to use new constants/utils

### Week 2: Content Extraction
- [ ] Create content directory structure
- [ ] Extract risks definitions (2.2)
- [ ] Extract legal sections (2.3)
- [ ] Extract definitions (2.4)
- [ ] Extract limitations and conclusion content
- [ ] Update component to consume content configs

### Week 3: Primitives
- [ ] Create report-primitives directory
- [ ] Implement enhanced TableBlock (3.2)
- [ ] Implement Heading component (3.3)
- [ ] Implement Page component (3.4)
- [ ] Implement RiskRow, LegalSection, ImageGrid
- [ ] Migrate BuildingSurveyReportTipTap to use primitives

### Week 4: Data Binding
- [ ] Implement type-safe getter functions (Option B)
- [ ] Add validation helpers
- [ ] Add computed properties (isLevel3, hasExtensions, etc.)
- [ ] Update component to use data bindings
- [ ] Add unit tests for bindings

---

## Testing Strategy

### Quick Wins Phase
```typescript
// tests/constants.test.ts
describe('RAG_COLORS', () => {
  it('should map all valid RAG statuses', () => {
    expect(RAG_COLORS['Green']).toBe('green');
    expect(RAG_COLORS['Amber']).toBe('orange');
    expect(RAG_COLORS['Red']).toBe('red');
    expect(RAG_COLORS['N/I']).toBe('white');
  });
});
```

### Content Extraction Phase
```typescript
// tests/content/risks.test.ts
describe('BUILDING_RISKS', () => {
  it('should have unique IDs', () => {
    const ids = Object.values(BUILDING_RISKS).map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should categorize all risks correctly', () => {
    const categories = Object.values(BUILDING_RISKS).map(r => r.category);
    categories.forEach(cat => {
      expect(['building', 'grounds', 'people']).toContain(cat);
    });
  });
});
```

### Primitives Phase
```typescript
// tests/primitives/TableBlock.test.tsx
import { render } from '@testing-library/react';
import { TableBlock } from '../TableBlock';

describe('TableBlock', () => {
  it('should render correct number of rows', () => {
    const { container } = render(
      <TableBlock widths={[50, 50]}>
        <p>Cell 1</p>
        <p>Cell 2</p>
        <p>Cell 3</p>
        <p>Cell 4</p>
      </TableBlock>
    );

    const rows = container.querySelectorAll('tr');
    expect(rows).toHaveLength(2);
  });

  it('should warn if widths do not sum to 100', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <TableBlock widths={[40, 40]}>
        <p>Cell 1</p>
        <p>Cell 2</p>
      </TableBlock>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Width total is 80%'),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});
```

### Data Binding Phase
```typescript
// tests/bindings.test.ts
describe('createDataBindings', () => {
  const mockForm: BuildingSurveyReportTipTap = {
    reportDetails: {
      clientName: 'John Doe',
      level: '3',
      // ...
    },
    // ...
  };

  it('should return client name', () => {
    const data = createDataBindings(mockForm);
    expect(data.getClientName()).toBe('John Doe');
  });

  it('should use fallback for missing data', () => {
    const incompleteForm = { ...mockForm, reportDetails: { ...mockForm.reportDetails, clientName: '' } };
    const data = createDataBindings(incompleteForm);
    expect(data.getClientName('Default Name')).toBe('Default Name');
  });

  it('should correctly identify level 3 reports', () => {
    const data = createDataBindings(mockForm);
    expect(data.isLevel3()).toBe(true);
  });
});
```

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ Zero hard-coded styles in BuildingSurveyReportTipTap.tsx
- ✅ Organization details externalized to config
- ✅ All utility functions unit tested
- ✅ Duplicate content bug fixed

### Phase 2 Success Criteria
- ✅ All static content moved to content files
- ✅ Content changes can be made without touching component code
- ✅ Content definitions are typed and validated

### Phase 3 Success Criteria
- ✅ Primitives extracted to shared package
- ✅ All primitives have unit tests
- ✅ BuildingSurveyReportTipTap reduced to <500 lines

### Phase 4 Success Criteria
- ✅ Type-safe data access throughout component
- ✅ No direct property access (form.reportDetails.x)
- ✅ Validation errors caught and logged

---

## Migration Safety

### Regression Testing
Before each phase deployment:

1. **Visual Regression Test**
   ```bash
   # Generate PDFs from test data
   npm run generate:test-reports
   
   # Compare with baseline
   npm run test:visual-regression
   ```

2. **Snapshot Testing**
   ```typescript
   it('should render identical output to baseline', () => {
     const result = renderToString(<PDF form={testData} />);
     expect(result).toMatchSnapshot();
   });
   ```

3. **Data Coverage Test**
   ```typescript
   // Ensure all data paths are covered
   const usedPaths = extractDataPaths(PDF);
   const schemaPaths = getAllSchemaPaths(BuildingSurveyFormData);
   const unusedPaths = schemaPaths.filter(p => !usedPaths.includes(p));
   console.log('Unused data paths:', unusedPaths);
   ```

---

## Future Phases (Beyond 4 weeks)

### Phase 5: Template Versioning
- Add template metadata (version, publishedAt)
- Tag survey documents with template version
- Support regeneration with different templates

### Phase 6: Template Descriptor System
- Implement JSON/TypeScript template configuration
- Build template renderer/interpreter
- Create template validation tooling

### Phase 7: Multi-tenant Support
- Move org config to database
- Add tenant-scoped template overrides
- Support custom branding per tenant

### Phase 8: Template Authoring UI
- Visual template editor
- Preview system
- Version control and publishing workflow

---

## References

- **Original Proposal:** [survey-report-templates-proposal.md](./survey-report-templates-proposal.md)
- **Current Implementation:** `app/home/surveys/building-survey-reports/BuildingSurveyReportTipTap.tsx`
- **Schema Definition:** `app/home/surveys/building-survey-reports/BuildingSurveyReportSchema.ts`
- **Related Features:** 
  - [Survey Document Editor Plan](./survey-document-editor-plan.md)
  - [Inline Conditions Editor](./inline-conditions-editor.md)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| TBD | Use type-safe getters (Option B) for data binding | Balance of type safety and simplicity; easiest to migrate later |
| TBD | Extract content first, primitives second | Content extraction delivers immediate value and unblocks content updates |
| TBD | Keep org config in code initially | Defer database migration until multi-tenant requirements are clear |

---

## Questions & Considerations

### Open Questions
1. Should we support multiple organizations in Phase 2, or wait until Phase 7?
2. Do we need translation/localization support? If so, when?
3. Should template selection be per-organization or per-document?
4. How do we handle template versioning for historical reports?

### Technical Debt
- **Current:** 650+ lines of monolithic component
- **After Phase 3:** Should be <300 lines with primitives
- **After Phase 6:** Should be <100 lines with template descriptor

### Dependencies
- React 18+
- Next.js (for Image component)
- uuid (for unique IDs)
- Optional: Zod (if using Option D for data binding)

---

## Getting Started

To begin implementation:

1. **Create feature branch:**
   ```bash
   git checkout -b feature/report-refactor-phase-1
   ```

2. **Start with constants extraction:**
   ```bash
   # Create files
   touch app/home/surveys/building-survey-reports/constants.ts
   touch app/home/surveys/building-survey-reports/utils.ts
   touch app/home/surveys/building-survey-reports/org-config.ts
   ```

3. **Run tests after each change:**
   ```bash
   npm test -- --watch building-survey
   ```

4. **Generate comparison report:**
   ```bash
   npm run generate:comparison-report
   ```

---

*Last Updated: 2024 (Initial Plan)*
*Next Review: After Phase 1 completion*

