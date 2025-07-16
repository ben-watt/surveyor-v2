import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'autosaved';

export interface AutoSaveOptions {
  /** Delay in milliseconds before triggering autosave (default: 3000) */
  delay?: number;
  /** Whether to show toast notifications for autosave (default: false) */
  showToast?: boolean;
  /** Whether to enable autosave (default: true) */
  enabled?: boolean;
  /** Custom error message for autosave failures */
  errorMessage?: string;
  /** Custom success message for autosave */
  successMessage?: string;
}

export interface AutoSaveResult<T> {
  /** Function to trigger manual save */
  save: (data: T, options?: { auto?: boolean }) => Promise<void>;
  /** Current save status */
  saveStatus: AutoSaveStatus;
  /** Whether a save operation is currently in progress */
  isSaving: boolean;
  /** Timestamp of the last successful save */
  lastSavedAt: Date | null;
  /** Function to trigger autosave with current data */
  triggerAutoSave: (data: T) => void;
  /** Function to reset the save status */
  resetStatus: () => void;
}

/**
 * Custom hook for handling autosave functionality in forms
 * @param saveFunction - Function that handles the actual saving logic
 * @param options - Configuration options for autosave behavior
 * @returns AutoSaveResult with save functions and status
 */
export function useAutoSave<T>(
  saveFunction: (data: T, options?: { auto?: boolean }) => Promise<void>,
  options: AutoSaveOptions = {}
): AutoSaveResult<T> {
  const {
    delay = 3000,
    showToast = false,
    enabled = true,
    errorMessage = 'Failed to save changes',
    successMessage = 'Changes saved automatically'
  } = options;

  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<T | null>(null);

  console.log('[useAutoSave] Hook initialized with options:', { delay, showToast, enabled });

  const resetStatus = useCallback(() => {
    setSaveStatus('idle');
  }, []);

  const save = useCallback(async (data: T, { auto = false }: { auto?: boolean } = {}) => {
    if (!enabled) {
      console.log('[useAutoSave] Autosave disabled, skipping save');
      return;
    }

    console.log('[useAutoSave] Starting save operation:', { auto, data });

    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      await saveFunction(data, { auto });
      
      lastSavedDataRef.current = data;
      setLastSavedAt(new Date());
      setSaveStatus(auto ? 'autosaved' : 'saved');
      
      console.log('[useAutoSave] Save successful:', { auto, status: auto ? 'autosaved' : 'saved' });
      
      // Show toast only if enabled and not an autosave (or if autosave toast is enabled)
      if (showToast && (!auto || options.showToast)) {
        toast.success(auto ? successMessage : 'Changes saved successfully');
      }
      
      // Reset status after a delay
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      console.error('[useAutoSave] Save failed:', error);
      
      if (showToast && (!auto || options.showToast)) {
        toast.error(auto ? errorMessage : 'Failed to save changes');
      }
      
      // Reset error status after a delay
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [saveFunction, enabled, showToast, successMessage, errorMessage, options.showToast]);

  const triggerAutoSave = useCallback((data: T) => {
    if (!enabled || isSaving) {
      console.log('[useAutoSave] Skipping autosave:', { enabled, isSaving });
      return;
    }
    
    console.log('[useAutoSave] Triggering autosave with delay:', delay);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      console.log('[useAutoSave] Clearing existing autosave timer');
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      console.log('[useAutoSave] Executing autosave');
      save(data, { auto: true });
    }, delay);
  }, [enabled, isSaving, save, delay]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        console.log('[useAutoSave] Cleaning up autosave timer');
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    save,
    saveStatus,
    isSaving,
    lastSavedAt,
    triggerAutoSave,
    resetStatus
  };
} 