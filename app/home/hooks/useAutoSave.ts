import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'autosaved';

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
  /** Whether there are pending changes to be saved */
  hasPendingChanges: boolean;
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
    delay = 500,
    showToast = false,
    enabled = true,
    errorMessage = 'Failed to save changes',
    successMessage = 'Changes saved automatically'
  } = options;

  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<T | null>(null);

  console.log('[useAutoSave] Hook initialized with options:', { delay, showToast, enabled });

  const resetStatus = useCallback(() => {
    setSaveStatus('idle');
    setHasPendingChanges(false);
    // Clear last saved data to allow fresh comparisons
    lastSavedDataRef.current = null;
  }, []);

  const save = useCallback(async (data: T, { auto = false }: { auto?: boolean } = {}) => {
    if (!enabled) {
      console.log('[useAutoSave] Autosave disabled, skipping save');
      return;
    }

    console.log('[useAutoSave] Starting save operation:', { auto, data });

    try {
      // Skip save if data hasn't changed since the last successful save
      if (lastSavedDataRef.current && JSON.stringify(lastSavedDataRef.current) === JSON.stringify(data)) {
        console.log('[useAutoSave] Data unchanged from last save, skipping save');
        return;
      }
      setIsSaving(true);
      setSaveStatus('saving');
      setHasPendingChanges(false);
      
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      await saveFunction(data, { auto });
      
      lastSavedDataRef.current = data;
      setLastSavedAt(new Date());
      setSaveStatus(auto ? 'autosaved' : 'saved');
      
      console.log('[useAutoSave] Save successful:', { auto, status: auto ? 'autosaved' : 'saved' });
      
      // Show toast only if enabled and not an autosave (or if autosave toast is enabled)
      if (showToast && (!auto || options.showToast)) {
        toast.success(auto ? successMessage : 'Changes saved successfully');
      }
      
      // Clear existing status reset timer
      if (statusResetTimerRef.current) {
        clearTimeout(statusResetTimerRef.current);
      }
      
      // Reset status after a longer delay (10 seconds instead of 2)
      statusResetTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 10000);
    } catch (error) {
      setSaveStatus('error');
      setHasPendingChanges(false);
      console.error('[useAutoSave] Save failed:', error);
      
      if (showToast && (!auto || options.showToast)) {
        toast.error(auto ? errorMessage : 'Failed to save changes');
      }
      
      // Clear existing status reset timer
      if (statusResetTimerRef.current) {
        clearTimeout(statusResetTimerRef.current);
      }
      
      // Reset error status after a longer delay
      statusResetTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 10000);
    } finally {
      setIsSaving(false);
    }
  }, [saveFunction, enabled, showToast, successMessage, errorMessage, options.showToast]);

  const triggerAutoSave = useCallback((data: T) => {
    if (!enabled || isSaving) {
      console.log('[useAutoSave] Skipping autosave:', { enabled, isSaving });
      return;
    }
    
    // Do not schedule autosave if data equals the last successfully saved snapshot
    if (lastSavedDataRef.current && JSON.stringify(lastSavedDataRef.current) === JSON.stringify(data)) {
      console.log('[useAutoSave] Data unchanged from last save, skipping autosave trigger');
      return;
    }
    
    console.log('[useAutoSave] Triggering autosave with delay:', delay);
    console.log('[useAutoSave] Current data for autosave:', data);
    console.log('[useAutoSave] Last saved data:', lastSavedDataRef.current);
    
    // Set pending status immediately when changes are detected
    setSaveStatus('pending');
    setHasPendingChanges(true);
    
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        console.log('[useAutoSave] Cleaning up autosave timer');
        clearTimeout(debounceTimerRef.current);
      }
      if (statusResetTimerRef.current) {
        console.log('[useAutoSave] Cleaning up status reset timer');
        clearTimeout(statusResetTimerRef.current);
      }
    };
  }, []);

  return {
    save,
    saveStatus,
    isSaving,
    hasPendingChanges,
    lastSavedAt,
    triggerAutoSave,
    resetStatus
  };
} 