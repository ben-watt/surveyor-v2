# Auto-Save Form Validation Solution

## Problem

When forms were converted to auto-save functionality, validation was bypassed because:

1. **No form submission** = No validation trigger
2. **No errors object passed** = No error display  
3. **Auto-save bypassed validation** = Invalid data could be saved

## Solution Overview

The solution implements **validation-before-save** with real-time error display:

1. **Validate before auto-saving** - Only save when form is valid
2. **Real-time validation** - Show errors as user types (`mode: 'onChange'`)
3. **Error display** - Pass `errors` object to input components
4. **Graceful degradation** - Auto-save skips if validation fails

## Implementation Details

### 1. Enhanced Auto-Save Hooks

Updated `useAutoSaveForm` and `useAutoSaveSurveyForm` hooks to:

- Accept `trigger` function for validation
- Add `validateBeforeSave` option (default: true)
- Validate form before auto-saving
- Skip auto-save if validation fails

```typescript
// Enhanced hook signature
export function useAutoSaveForm<T extends FieldValues>(
  saveFunction: (data: T, options?: { auto?: boolean }) => Promise<void>,
  watch: UseFormWatch<T>,
  getValues: UseFormGetValues<T>,
  trigger?: UseFormTrigger<T>, // New parameter
  options: AutoSaveFormOptions = {}
): AutoSaveResult<T>
```

### 2. Form Configuration Updates

All converted forms now include:

```typescript
const methods = useForm<FormData>({
  defaultValues: initialData,
  mode: 'onChange' // Enable validation on change
});

const { register, control, watch, getValues, trigger, formState: { errors } } = methods;
```

### 3. Auto-Save Hook Usage

Updated all auto-save hook calls to pass `trigger` function:

```typescript
const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
  saveFunction,
  watch,
  getValues,
  trigger, // Pass trigger function
  {
    delay: 2000,
    showToast: false,
    enabled: !!id,
    validateBeforeSave: true // Enable validation before auto-save
  }
);
```

### 4. Error Display

Updated input components to receive and display errors:

```typescript
// Standard forms
<Input
  labelTitle="Name"
  register={() => register("name", { required: "Name is required" })}
  errors={errors}
/>

// Survey forms (via mapToInputType)
{mapToInputType(property, reqName, register, control, errors)}
```

### 5. Enhanced mapToInputType Function

Updated the utility function to accept and pass errors:

```typescript
export function mapToInputType<T, K extends FieldValues>(
  input: InputT<T>,
  registerName: Path<K>,
  register: UseFormRegister<K>,
  control: Control<K>,
  errors?: FieldErrors<K> // New parameter
)
```

## Forms Updated

### ✅ Completed Forms

1. **Sections Form** (`app/home/sections/form.tsx`)
   - Real-time validation for name and order fields
   - Auto-save only when valid

2. **Conditions Form** (`app/home/conditions/form.tsx`)
   - Validation for name and phrase fields
   - Auto-save enabled for existing phrases only

3. **Elements Form** (`app/home/elements/form.tsx`)
   - Validation for name, section, and order fields
   - Auto-save enabled for existing elements only

4. **Building Components Form** (`app/home/building-components/form.tsx`)
   - Validation for name and element fields
   - Auto-save enabled for existing components only

5. **Profile Form** (`app/home/profile/page.tsx`)
   - Validation for name, email, and signature text
   - Special handling for file upload fields
   - Auto-save enabled when form is ready

6. **Property Description Form** (`app/home/surveys/[id]/property-description/page.tsx`)
   - Uses `useAutoSaveSurveyForm` for nested Input<T> structure
   - Validation for dynamic form fields
   - Auto-save enabled for all property descriptions

7. **Checklist Form** (`app/home/surveys/[id]/checklist/page.tsx`)
   - Uses `useAutoSaveSurveyForm` for checklist items
   - Validation for dynamic checklist fields
   - Auto-save enabled for all checklists

## Validation Behavior

### Auto-Save Validation Flow

1. **User types** → Form change detected
2. **Debounce timer** → Wait for delay period
3. **Validation check** → Run `trigger()` to validate form
4. **Valid form** → Proceed with auto-save
5. **Invalid form** → Skip auto-save, show errors

### Error Display

- **Real-time errors** - Show as user types/changes fields
- **Contextual messages** - Specific error messages for each field
- **Visual feedback** - Red text and styling for errors
- **Accessibility** - Proper ARIA attributes for screen readers

### Manual Save Validation

Manual save operations (if any) also validate before saving:

```typescript
const save = useCallback(async (data?: T, options?: { auto?: boolean }) => {
  const currentData = data || getValues();
  
  // Validate before saving if validation is enabled and trigger is available
  if (validateBeforeSave && trigger && !options?.auto) {
    const isValid = await trigger();
    if (!isValid) {
      throw new Error('Form validation failed');
    }
  }
  
  return autoSave.save(currentData, options);
}, [autoSave, getValues, validateBeforeSave, trigger]);
```

## Benefits

1. **Data Quality** - Invalid data cannot be auto-saved
2. **User Experience** - Immediate feedback on validation errors
3. **Consistency** - All forms follow the same validation pattern
4. **Performance** - Only valid data is processed and saved
5. **Accessibility** - Proper error handling and display

## Configuration Options

### validateBeforeSave (boolean, default: true)
- When `true`: Validates form before auto-saving
- When `false`: Skips validation (legacy behavior)

### mode: 'onChange'
- Enables real-time validation as user types
- Shows errors immediately after field changes

## Testing

To test the validation:

1. **Leave required fields empty** - Should show error messages
2. **Fill invalid data** - Should show validation errors
3. **Valid data** - Should auto-save successfully
4. **Console logs** - Check for validation debug messages

## Future Enhancements

1. **Custom validation rules** - Add more complex validation logic
2. **Async validation** - Support for server-side validation
3. **Field-level validation** - Validate individual fields on blur
4. **Validation schemas** - Integration with Zod or Yup schemas
5. **Error aggregation** - Summary of all form errors

## Debugging

Enable debug logging by checking console for:
- `[useAutoSaveForm] Validating form before autosave`
- `[useAutoSaveForm] Form validation result: true/false`
- `[useAutoSaveForm] Form is invalid, skipping autosave`

This ensures validation is working correctly and auto-save only occurs for valid forms. 