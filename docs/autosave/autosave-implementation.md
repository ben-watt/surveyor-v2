# Autosave Implementation

This document describes the autosave functionality implemented in the Surveyor v2 application.

## Overview

The autosave feature provides automatic saving of form data as users type, with configurable debouncing, status indicators, and error handling. It's designed to work seamlessly with React Hook Form and can be easily integrated into existing forms.

## Components

### 1. `useAutoSave` Hook

The core autosave hook that provides the basic autosave functionality.

```typescript
import { useAutoSave } from '@/app/home/hooks/useAutoSave';

const { save, saveStatus, isSaving, triggerAutoSave, resetStatus } = useAutoSave(
  saveFunction,
  options,
);
```

**Parameters:**

- `saveFunction`: Function that handles the actual saving logic
- `options`: Configuration options (see AutoSaveOptions interface)

**Returns:**

- `save`: Function to trigger manual save
- `saveStatus`: Current save status ('idle' | 'saving' | 'saved' | 'error' | 'autosaved')
- `isSaving`: Boolean indicating if a save operation is in progress
- `triggerAutoSave`: Function to trigger autosave with current data
- `resetStatus`: Function to reset the save status

### 2. `useAutoSaveForm` Hook

A specialized hook that integrates autosave functionality with React Hook Form.

```typescript
import { useAutoSaveForm } from '@/app/home/hooks/useAutoSaveForm';

const { save, saveStatus, isSaving } = useAutoSaveForm(saveFunction, watch, getValues, options);
```

**Parameters:**

- `saveFunction`: Function that handles the actual saving logic
- `watch`: React Hook Form's watch function
- `getValues`: React Hook Form's getValues function
- `options`: Configuration options (extends AutoSaveOptions)

### 3. `AutoSaveStatusIndicator` Component

A reusable component to display autosave status with appropriate icons and styling.

```typescript
import { AutoSaveStatusIndicator } from '@/app/home/components/AutoSaveStatus';

<AutoSaveStatusIndicator
  status={saveStatus}
  showIcon={true}
  showText={true}
/>
```

### 4. `LastSavedIndicator` Component

A component to display the last saved timestamp and current save status. When the form hasn't been changed, it shows the entity's `updatedAt` from the database.

```typescript
import { LastSavedIndicator } from '@/app/home/components/LastSavedIndicator';

<LastSavedIndicator
  status={saveStatus}
  lastSavedAt={lastSavedAt}
  entityUpdatedAt={entityData?.updatedAt}
  className="text-sm"
/>
```

## Configuration Options

### AutoSaveOptions

```typescript
interface AutoSaveOptions {
  delay?: number; // Delay in milliseconds (default: 3000)
  showToast?: boolean; // Show toast notifications (default: false)
  enabled?: boolean; // Enable autosave (default: true)
  errorMessage?: string; // Custom error message
  successMessage?: string; // Custom success message
}
```

### AutoSaveFormOptions

```typescript
interface AutoSaveFormOptions extends AutoSaveOptions {
  watchChanges?: boolean; // Trigger autosave on form changes (default: true)
  watchDelay?: number; // Debounce delay for form watching (default: 1000)
  skipFocusBlur?: boolean; // Skip focus/blur events (default: true)
}
```

## Forms Converted to Auto-Save

The following forms have been successfully converted to use auto-save functionality:

### ✅ Completed Conversions

1. **Sections Form** (`app/home/sections/form.tsx`)

   - Removed save button and form submission
   - Added `useAutoSaveForm` hook
   - Added `LastSavedIndicator` component
   - Auto-save enabled only for existing sections

2. **Conditions Form** (`app/home/conditions/form.tsx`)

   - Removed save button and form submission
   - Added `useAutoSaveForm` hook
   - Added `LastSavedIndicator` component
   - Auto-save enabled only for existing phrases

3. **Profile Page** (`app/home/profile/page.tsx`)

   - Removed save button and form submission
   - Added `useAutoSaveForm` hook
   - Added `LastSavedIndicator` component
   - Handles file upload fields properly

4. **Property Description Form** (`app/home/surveys/[id]/property-description/page.tsx`)

   - Removed save button and form submission
   - Added `useAutoSaveForm` hook
   - Added `LastSavedIndicator` component

5. **Checklist Form** (`app/home/surveys/[id]/checklist/page.tsx`)

   - Removed save button and form submission
   - Added `useAutoSaveForm` hook
   - Added `LastSavedIndicator` component

6. **Elements Form** (`app/home/elements/form.tsx`)

   - Already converted to auto-save
   - Uses `useAutoSaveForm` hook
   - Uses `LastSavedIndicator` component

7. **Building Components Form** (`app/home/building-components/form.tsx`)
   - Already converted to auto-save
   - Uses `useAutoSaveForm` hook
   - Uses `LastSavedIndicator` component

### 🔄 Forms Still Needing Conversion

The following forms still need to be converted to auto-save:

1. **Report Details Form** (`app/home/surveys/[id]/report-details/ReportDetailsForm.tsx`)

   - Uses `SaveButtonWithUploadStatus` for image uploads
   - Complex form with multiple image upload fields
   - May require special handling for upload status

2. **Element Form** (`app/home/surveys/[id]/condition/ElementForm.tsx`)

   - Uses `SaveButtonWithUploadStatus` for image uploads
   - Complex form with image uploads and component management
   - May require special handling for upload status

3. **Inspection Form** (`app/home/surveys/[id]/condition/InspectionForm.tsx`)

   - Uses `SaveButtonWithUploadStatus` for image uploads
   - Complex form with image uploads
   - May require special handling for upload status

4. **Building Survey Form** (`app/home/surveys/building-survey-reports/BuildingSurveyForm.tsx`)

   - Complex form with multiple sections and actions
   - Has "Save As Draft" and "Generate Report" actions
   - May need different approach due to complexity

5. **Tenants Page** (`app/home/tenants/page.tsx`)
   - Simple creation form (doesn't need auto-save)
   - One-time creation, not editing

## Usage Examples

### Autosave-Only Implementation (Recommended)

For forms where you want automatic saving without a manual save button:

```typescript
import { useAutoSaveForm } from '@/app/home/hooks/useAutoSaveForm';
import { LastSavedIndicator } from '@/app/home/components/LastSavedIndicator';

function MyForm() {
  const form = useForm<FormData>();
  const { watch, getValues } = form;

  const saveData = async (data: FormData, { auto = false }) => {
    await api.save(data);
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveData,
    watch,
    getValues,
    {
      delay: 1500,
      showToast: false,
      enabled: true
    }
  );

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        {/* Form header with autosave status */}
        <div className="flex justify-between items-center">
          <h2>My Form</h2>
          <LastSavedIndicator
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            entityUpdatedAt={entityData?.updatedAt}
            className="text-sm"
          />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Your form inputs here */}
        </div>
      </div>
    </FormProvider>
  );
}
```

### Basic Implementation with Manual Save

```typescript
import { useAutoSave } from '@/app/home/hooks/useAutoSave';

function MyForm() {
  const saveData = async (data: FormData, { auto = false }) => {
    // Your save logic here
    await api.save(data);
  };

  const { save, saveStatus, isSaving } = useAutoSave(saveData, {
    delay: 2000,
    showToast: false
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      save(formData, { auto: false });
    }}>
      {/* Form fields */}
      <button disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### React Hook Form Integration (Autosave-Only)

```typescript
import { useAutoSaveForm } from '@/app/home/hooks/useAutoSaveForm';
import { LastSavedIndicator } from '@/app/home/components/LastSavedIndicator';

function MyForm() {
  const form = useForm<FormData>();
  const { watch, getValues } = form;

  const saveData = async (data: FormData, { auto = false }) => {
    await api.save(data);
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveData,
    watch,
    getValues,
    {
      delay: 2000,
      showToast: false,
      enabled: true
    }
  );

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        {/* Form fields */}
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          entityUpdatedAt={entityData?.updatedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
}
```

### Status Display

```typescript
import { LastSavedIndicator } from '@/app/home/components/LastSavedIndicator';

function MyForm() {
  // ... autosave setup

  return (
    <div className="space-y-4">
      {/* Form fields */}

      <LastSavedIndicator
        status={saveStatus}
        lastSavedAt={lastSavedAt}
        className="text-sm justify-center"
      />
    </div>
  );
}
```

## Best Practices

### 1. Save Function Implementation

Your save function should:

- Accept an `auto` parameter to distinguish between manual and autosave
- Handle errors appropriately and re-throw them for autosave error handling
- Only show user notifications for manual saves (not autosaves)

```typescript
const saveData = async (data: FormData, { auto = false } = {}) => {
  try {
    await api.save(data);
    if (!auto) {
      toast.success('Saved successfully');
    }
  } catch (error) {
    if (!auto) {
      toast.error('Save failed');
    }
    throw error; // Re-throw for autosave error handling
  }
};
```

### 2. Conditional Autosave

Enable autosave only when appropriate:

```typescript
const { save, saveStatus, isSaving } = useAutoSaveForm(saveData, watch, getValues, {
  enabled: !!existingId, // Only autosave existing records
  delay: 2000,
});
```

### 3. User Feedback

Provide clear feedback about autosave status:

```typescript
<LastSavedIndicator
  status={saveStatus}
  lastSavedAt={lastSavedAt}
  className="text-sm justify-center"
/>
```

## Migration Guide

### From Manual Save Only

1. **Extract save logic** into a separate function that accepts an `auto` parameter
2. **Add autosave hook** using `useAutoSaveForm`
3. **Remove save button** and form submission handling
4. **Add status indicator** to show save status

### Example Migration

**Before:**

```typescript
const onSubmit = async (data) => {
  await api.save(data);
  toast.success('Saved');
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    {/* Form fields */}
    <button type="submit">Save</button>
  </form>
);
```

**After:**

```typescript
const saveData = async (data, { auto = false } = {}) => {
  await api.save(data);
  if (!auto) toast.success('Saved');
};

const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
  saveData,
  watch,
  getValues
);

return (
  <div className="grid gap-4">
    {/* Form fields */}
    <LastSavedIndicator
      status={saveStatus}
      lastSavedAt={lastSavedAt}
      className="text-sm justify-center"
    />
  </div>
);
```

## Status Types

- `idle`: No save operation in progress (shows entity's `updatedAt`)
- `saving`: Save operation currently in progress
- `saved`: Manual save completed successfully
- `autosaved`: Autosave completed successfully
- `error`: Save operation failed

## Last Saved Timestamp Logic

The `LastSavedIndicator` component intelligently displays the most relevant timestamp:

1. **When form is actively being saved** (`saving` status): Shows "Saving..." without timestamp
2. **When form has been recently saved** (`saved` or `autosaved` status): Shows the autosave timestamp
3. **When form hasn't been changed** (`idle` status): Shows the entity's `updatedAt` from the database
4. **When save fails** (`error` status): Shows error message without timestamp

This ensures users always see the most accurate "last saved" information, whether it's from recent autosave activity or the entity's database record.

## Smart Event Handling

The autosave system intelligently handles form events to prevent unnecessary saves:

### Event Filtering

- **Focus/Blur Events**: Skipped by default to prevent saves on field interactions
- **Value Changes**: Only triggers autosave when actual values change
- **Event Types**: Filters out non-value-change events

### Value Comparison

- **Deep Comparison**: Uses JSON.stringify to compare form values
- **Previous Values**: Tracks previous state to detect actual changes
- **Initialization**: Sets baseline values when form is first loaded

### Configuration

```typescript
const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(saveData, watch, getValues, {
  delay: 2000,
  skipFocusBlur: true, // Skip focus/blur events (default: true)
  enabled: true,
});
```

## Error Handling

The autosave system includes comprehensive error handling:

- Automatic error status display
- Configurable error messages
- Error status timeout (10 seconds)
- Separate error handling for manual vs autosave operations

## Performance Considerations

- Debouncing prevents excessive API calls
- Status timeouts prevent UI clutter
- Conditional autosave prevents unnecessary operations
- Cleanup on component unmount prevents memory leaks
- Value comparison prevents autosave on focus/blur events
- Smart event filtering reduces unnecessary triggers

## Next Steps

### Forms Requiring Special Handling

The remaining forms that need conversion have image uploads and complex interactions:

1. **Forms with Image Uploads**: These forms use `SaveButtonWithUploadStatus` which tracks upload progress. They may need:

   - Integration with the existing upload status tracking
   - Special handling for upload completion before autosave
   - Consideration of upload progress in the save status

2. **Complex Survey Forms**: The building survey form has multiple actions and sections that may need:
   - Different autosave strategies for different sections
   - Integration with the existing action menu
   - Consideration of form validation across sections

### Recommendations

1. **For Image Upload Forms**: Consider creating a specialized autosave hook that integrates with the existing upload status system
2. **For Complex Forms**: Consider implementing autosave on a per-section basis rather than the entire form
3. **Testing**: Ensure all converted forms work correctly with the new autosave functionality
4. **User Feedback**: Monitor user experience with the new autosave feature and adjust timing/behavior as needed
