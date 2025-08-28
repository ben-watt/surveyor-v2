import { useCallback, useEffect, useRef } from 'react';
import { FieldValues, UseFormWatch, UseFormGetValues, UseFormTrigger } from 'react-hook-form';
import { useAutoSave, AutoSaveOptions, AutoSaveResult } from './useAutoSave';

export interface AutoSaveFormOptions extends AutoSaveOptions {
  watchChanges?: boolean;
  watchDelay?: number;
  skipFocusBlur?: boolean;
  validateBeforeSave?: boolean; // New option to validate before saving
  // Removed validateOnlyChangedField to ensure full-form validity before saving
  saveImmediatelyOnBecomeValid?: boolean; // If true, save immediately when form transitions invalid -> valid
}

/**
 * Custom hook that integrates autosave functionality with react-hook-form
 * @param saveFunction - Function that handles the actual saving logic
 * @param watch - react-hook-form's watch function
 * @param getValues - react-hook-form's getValues function
 * @param trigger - react-hook-form's trigger function for validation
 * @param options - Configuration options for autosave behavior
 * @returns AutoSaveResult with save functions and status
 */
export function useAutoSaveForm<T extends FieldValues>(
  saveFunction: (data: T, options?: { auto?: boolean }) => Promise<void>,
  watch: UseFormWatch<T>,
  getValues: UseFormGetValues<T>,
  trigger?: UseFormTrigger<T>,
  options: AutoSaveFormOptions = {}
): AutoSaveResult<T> & { skipNextChange: () => void } {
  const {
    watchChanges = true,
    watchDelay = 300,
    skipFocusBlur = true,
    validateBeforeSave = true,
    saveImmediatelyOnBecomeValid = true,
    ...autoSaveOptions
  } = options;

  const autoSave = useAutoSave(saveFunction, autoSaveOptions);
  // Keep stable references to autosave functions to avoid re-subscribing the watcher on each render
  const triggerAutoSaveRef = useRef(autoSave.triggerAutoSave);
  const autoSaveSaveRef = useRef(autoSave.save);
  useEffect(() => {
    triggerAutoSaveRef.current = autoSave.triggerAutoSave;
    autoSaveSaveRef.current = autoSave.save;
  }, [autoSave.triggerAutoSave, autoSave.save]);
  // Store a JSON snapshot to avoid reference equality issues when RHF mutates the same object
  const previousValuesRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationWasValidRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const skipUntilRef = useRef<number>(0);

  // Watch form changes and trigger autosave
  useEffect(() => {
    if (!watchChanges) return;

    console.log('[useAutoSaveForm] Setting up watch subscription');

    const subscription = watch(async (data, { name, type }) => {
      console.log('[useAutoSaveForm] Form change detected:', {
        name,
        type,
        hasData: !!data,
        skipFocusBlur,
        shouldSkip: skipFocusBlur && (type === 'focus' || type === 'blur')
      });

      // Skip if no data
      if (!data) {
        console.log('[useAutoSaveForm] No data, skipping autosave');
        return;
      }
      
      // Skip if this is just a focus/blur event without value change
      if (skipFocusBlur && (type === 'focus' || type === 'blur')) {
        console.log('[useAutoSaveForm] Skipping focus/blur event');
        return;
      }
      
      // Check if values have actually changed (compare JSON snapshots)
      const currentValues = data as T;
      const currentValuesString = JSON.stringify(currentValues);
      const previousValuesString = previousValuesRef.current;

      // Check if we should skip this change (e.g., after a reset)
      const now = Date.now();
      if (skipUntilRef.current > now) {
        console.log('[useAutoSaveForm] Skipping change after reset (skip until:', skipUntilRef.current, 'now:', now, ')');
        previousValuesRef.current = currentValuesString;
        // Still mark as initialized if we haven't already
        if (!isInitializedRef.current && currentValuesString) {
          isInitializedRef.current = true;
        }
        return;
      }

      // Initialize on first real data if not already initialized
      if (!isInitializedRef.current && currentValuesString) {
        console.log('[useAutoSaveForm] Initializing baseline values');
        previousValuesRef.current = currentValuesString;
        isInitializedRef.current = true;
        return; // Skip autosave on initialization
      }

      console.log('[useAutoSaveForm] Comparing values:', {
        currentValues,
        previousValuesString,
        hasChanged: !previousValuesString || currentValuesString !== previousValuesString
      });

      if (previousValuesString && currentValuesString === previousValuesString) {
        console.log('[useAutoSaveForm] No actual change, skipping autosave');
        return; // No actual change, skip autosave
      }

      // Update previous values snapshot
      previousValuesRef.current = currentValuesString;

      // If this change caused the form to become valid (and it wasn't before), save immediately
      if (validateBeforeSave && trigger) {
        const nowValid = await trigger();
        console.log('[useAutoSaveForm] Immediate validation result:', nowValid, 'prev:', lastValidationWasValidRef.current);
          if (nowValid && !lastValidationWasValidRef.current) {
          if (saveImmediatelyOnBecomeValid) {
            // Clear any pending timer and flush save now
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = null;
            }
            lastValidationWasValidRef.current = true;
            await autoSaveSaveRef.current(currentValues, { auto: true });
            return;
          }
        }
        lastValidationWasValidRef.current = nowValid;
      }
      
      // Clear existing timer
      if (debounceTimerRef.current) {
        console.log('[useAutoSaveForm] Clearing existing timer');
        clearTimeout(debounceTimerRef.current);
      }
      
      // Debounce the autosave trigger
      console.log(`[useAutoSaveForm] Setting autosave timer for ${watchDelay}ms`);
      debounceTimerRef.current = setTimeout(async () => {
        console.log('[useAutoSaveForm] Triggering autosave with data:', currentValues);
        
        // Validate before saving if validation is enabled and trigger is available
        if (validateBeforeSave && trigger) {
          console.log('[useAutoSaveForm] Validating form before autosave');
          const isValid = await trigger();
          console.log('[useAutoSaveForm] Form validation result:', isValid);
          
          if (!isValid) {
            console.log('[useAutoSaveForm] Form is invalid, scheduling single retry after short delay');
            // Edge case: some controlled components update validation state slightly after change
            // Retry once shortly after to catch transitions from invalid -> valid (e.g., final dropdown selection)
            setTimeout(async () => {
              const recheck = await trigger();
              console.log('[useAutoSaveForm] Re-validation result:', recheck);
                if (recheck) {
                  triggerAutoSaveRef.current(currentValues);
                }
            }, 150);
            return;
          }
        }
        
        triggerAutoSaveRef.current(currentValues);
      }, watchDelay);
    });

    return () => {
      console.log('[useAutoSaveForm] Cleaning up watch subscription');
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [watch, watchChanges, watchDelay, skipFocusBlur, validateBeforeSave, saveImmediatelyOnBecomeValid, trigger]);

  // Reset initialization flag when watchChanges changes
  useEffect(() => {
    if (!watchChanges) {
      isInitializedRef.current = false;
      previousValuesRef.current = null;
    }
  }, [watchChanges]);

  // Enhanced save function that gets current form values and optionally validates
  const save = useCallback(async (data?: T, options?: { auto?: boolean }) => {
    const currentData = data || getValues();
    
    // Validate before saving if validation is enabled and trigger is available
    if (validateBeforeSave && trigger && !options?.auto) {
      console.log('[useAutoSaveForm] Validating form before manual save');
      const isValid = await trigger();
      console.log('[useAutoSaveForm] Form validation result:', isValid);
      
      if (!isValid) {
        console.log('[useAutoSaveForm] Form is invalid, cannot save');
        throw new Error('Form validation failed');
      }
    }
    
    return autoSave.save(currentData, options);
  }, [autoSave, getValues, validateBeforeSave, trigger]);

  // Function to skip changes for the next 500ms (useful before reset)
  const skipNextChange = useCallback(() => {
    skipUntilRef.current = Date.now() + 500;
  }, []);

  return {
    ...autoSave,
    save,
    skipNextChange
  };
}

/**
 * Specialized hook for survey forms with nested Input<T> structure
 * This hook is designed to work with forms where each field is an Input<T> object with a .value property
 */
export function useAutoSaveSurveyForm<T extends FieldValues>(
  saveFunction: (data: T, options?: { auto?: boolean }) => Promise<void>,
  watch: UseFormWatch<T>,
  getValues: UseFormGetValues<T>,
  trigger?: UseFormTrigger<T>,
  options: AutoSaveFormOptions = {}
): AutoSaveResult<T> & { skipNextChange: () => void } {
  const {
    watchChanges = true,
    watchDelay = 300,
    skipFocusBlur = true,
    validateBeforeSave = true,
    ...autoSaveOptions
  } = options;

  const autoSave = useAutoSave(saveFunction, autoSaveOptions);
  const previousValuesRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const skipUntilRef = useRef<number>(0);

  // Helper function to extract values from nested Input<T> structure
  const extractValues = useCallback((data: T): any => {
    const extracted: any = {};
    Object.keys(data).forEach((key) => {
      const field = data[key];
      // Check if this is an Input<T> object with a .value property
      if (field && typeof field === 'object' && 'value' in field) {
        extracted[key] = field.value;
      } else if (Array.isArray(field)) {
        // Handle arrays (like checklist items)
        extracted[key] = field.map(item => 
          item && typeof item === 'object' && 'value' in item ? item.value : item
        );
      } else {
        extracted[key] = field;
      }
    });
    return extracted;
  }, []);

  // Watch form changes and trigger autosave
  useEffect(() => {
    if (!watchChanges) return;

    console.log('[useAutoSaveSurveyForm] Setting up watch subscription');

    const subscription = watch(async (data, { name, type }) => {
      console.log('[useAutoSaveSurveyForm] Form change detected:', {
        name,
        type,
        hasData: !!data,
        skipFocusBlur,
        shouldSkip: skipFocusBlur && (type === 'focus' || type === 'blur')
      });

      // Skip if no data
      if (!data) {
        console.log('[useAutoSaveSurveyForm] No data, skipping autosave');
        return;
      }
      
      // Skip if this is just a focus/blur event without value change
      if (skipFocusBlur && (type === 'focus' || type === 'blur')) {
        console.log('[useAutoSaveSurveyForm] Skipping focus/blur event');
        return;
      }
      
      // Extract values from nested structure for comparison
      const currentValues = extractValues(data as T);
      const currentValuesString = JSON.stringify(currentValues);
      
      // Check if we should skip this change (e.g., after a reset)
      const now = Date.now();
      if (skipUntilRef.current > now) {
        console.log('[useAutoSaveSurveyForm] Skipping change after reset (skip until:', skipUntilRef.current, 'now:', now, ')');
        previousValuesRef.current = currentValuesString;
        // Still mark as initialized if we haven't already
        if (!isInitializedRef.current && currentValuesString) {
          isInitializedRef.current = true;
        }
        return;
      }
      
      // Initialize on first real data if not already initialized
      if (!isInitializedRef.current && currentValuesString) {
        console.log('[useAutoSaveSurveyForm] Initializing baseline values');
        previousValuesRef.current = currentValuesString;
        isInitializedRef.current = true;
        return; // Skip autosave on initialization
      }
      
      console.log('[useAutoSaveSurveyForm] Comparing values:', {
        currentValues,
        currentValuesString,
        previousValuesString: previousValuesRef.current,
        hasChanged: !previousValuesRef.current || currentValuesString !== previousValuesRef.current
      });
      
      if (previousValuesRef.current && currentValuesString === previousValuesRef.current) {
        console.log('[useAutoSaveSurveyForm] No actual change, skipping autosave');
        return; // No actual change, skip autosave
      }
      
      // Update previous values
      previousValuesRef.current = currentValuesString;
      
      // Clear existing timer
      if (debounceTimerRef.current) {
        console.log('[useAutoSaveSurveyForm] Clearing existing timer');
        clearTimeout(debounceTimerRef.current);
      }
      
      // Debounce the autosave trigger
      console.log(`[useAutoSaveSurveyForm] Setting autosave timer for ${watchDelay}ms`);
      debounceTimerRef.current = setTimeout(async () => {
        console.log('[useAutoSaveSurveyForm] Triggering autosave with data:', data);
        
        // Validate before saving if validation is enabled and trigger is available
        if (validateBeforeSave && trigger) {
          console.log('[useAutoSaveSurveyForm] Validating form before autosave');
          const isValid = await trigger();
          console.log('[useAutoSaveSurveyForm] Form validation result:', isValid);
          
          if (!isValid) {
            console.log('[useAutoSaveSurveyForm] Form is invalid, skipping autosave');
            return;
          }
        }
        
        autoSave.triggerAutoSave(data as T);
      }, watchDelay);
    });

    return () => {
      console.log('[useAutoSaveSurveyForm] Cleaning up watch subscription');
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [watch, watchChanges, watchDelay, autoSave, skipFocusBlur, validateBeforeSave, trigger, extractValues]);

  // Reset initialization flag when watchChanges changes
  useEffect(() => {
    if (!watchChanges) {
      isInitializedRef.current = false;
      previousValuesRef.current = null;
    }
  }, [watchChanges]);

  // Enhanced save function that gets current form values and optionally validates
  const save = useCallback(async (data?: T, options?: { auto?: boolean }) => {
    const currentData = data || getValues();
    
    // Validate before saving if validation is enabled and trigger is available
    if (validateBeforeSave && trigger && !options?.auto) {
      console.log('[useAutoSaveSurveyForm] Validating form before manual save');
      const isValid = await trigger();
      console.log('[useAutoSaveSurveyForm] Form validation result:', isValid);
      
      if (!isValid) {
        console.log('[useAutoSaveSurveyForm] Form is invalid, cannot save');
        throw new Error('Form validation failed');
      }
    }
    
    return autoSave.save(currentData, options);
  }, [autoSave, getValues, validateBeforeSave, trigger]);

  // Function to skip changes for the next 500ms (useful before reset)
  const skipNextChange = useCallback(() => {
    skipUntilRef.current = Date.now() + 500;
  }, []);

  return {
    ...autoSave,
    save,
    skipNextChange
  };
} 