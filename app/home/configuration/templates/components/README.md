# Variable Browser Component

## Overview

The Variable Browser is a side panel component that displays all available survey data variables in a searchable, collapsible tree structure. It helps users discover and insert Handlebars template variables without memorizing schema paths.

## Features

- **Searchable Tree View**: Browse all available variables organized by category
- **Type Indicators**: Color-coded badges show variable types (string, number, date, array, etc.)
- **Click to Insert**: Click any variable to insert it at the editor cursor position
- **Helper Hints**: Shows which Handlebars helpers work with each variable
- **Collapsible Sections**: Expand/collapse nested object structures
- **Copy to Clipboard**: Quick copy button for each variable
- **Context Descriptions**: Helpful descriptions for array and loop variables

## Usage

The VariableBrowser is automatically displayed in the template form when editing (not in preview mode).

### User Workflow

1. Open template editor
2. Browse variables in the right-side panel
3. Use search to filter variables
4. Click any variable to insert `{{variablePath}}` at cursor
5. Helper hints show recommended Handlebars helpers

### For Developers

```tsx
import { VariableBrowser } from './components/VariableBrowser';

<VariableBrowser
  onInsert={(path) => {
    // Insert {{path}} into editor
    editor.commands.insertContent(`{{${path}}}`);
  }}
  className="h-full"
/>
```

## Schema Parser

The `schemaParser.ts` utility defines the complete BuildingSurveyFormData schema structure with:

- All available variable paths
- Type information for each field
- Helper function suggestions
- Nested object traversal
- Array iteration guidance

## Type System

Variable types are color-coded:

- **Blue**: string
- **Green**: number
- **Purple**: boolean
- **Red**: date
- **Orange**: array
- **Gray**: object
- **Pink**: image

## Implementation Details

### Files Created

1. `app/home/surveys/templates/schemaParser.ts` - Schema parsing utility
2. `app/home/configuration/templates/components/VariableBrowser.tsx` - Main component

### Files Modified

1. `app/home/configuration/templates/form.tsx` - Integrated VariableBrowser into layout

### Key Features Implemented

- Two-column grid layout (main content + variable browser)
- Sticky positioning for the browser panel
- Hidden on mobile/tablet (lg:block)
- Only visible in edit mode (hidden during preview)
- Editor ref integration for insertContent
- Toast notifications for user feedback

## Examples

### Inserting Simple Variables

Click on:
- `reportDetails.clientName` → inserts `{{reportDetails.clientName}}`
- `propertyDescription.numberOfBedrooms` → inserts `{{propertyDescription.numberOfBedrooms}}`

### Array Variables

Variables marked as "array" type show descriptions like:
- `sections` - "Use with {{#each sections}}"
- Inside loops, use `{{this.property}}` syntax

### Helper Hints

Variables with helper hints show suggestions:
- Date fields → `formatDate` helper
- Currency fields → `formatCurrency` helper
- RAG status → `ragColor` helper

