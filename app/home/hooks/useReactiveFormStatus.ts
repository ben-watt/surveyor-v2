import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FormStatus } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { determineFormStatus } from './useFormStatus';
import { FORM_DEBOUNCE_DELAYS, PERFORMANCE_MARKS } from '@/app/home/config/formConstants';
import { PerformanceMonitor } from '@/app/home/utils/performanceMonitor';

export interface UseReactiveFormStatusOptions<T> {
  formData: T;
  validator: () => Promise<boolean>;
  hasDataChecker: (data: T) => boolean;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook that reactively computes form status based on current form state
 * 
 * This approach:
 * - Always keeps status in sync with form data
 * - Separates status computation from save logic
 * - Updates immediately as user types (with debouncing)
 * - Eliminates need to store status in database
 */
export function useReactiveFormStatus<T>({
  formData,
  validator,
  hasDataChecker,
  enabled = true,
  debounceMs = FORM_DEBOUNCE_DELAYS.STATUS_VALIDATION
}: UseReactiveFormStatusOptions<T>): FormStatus {
  const [status, setStatus] = useState<FormStatus>(FormStatus.Incomplete);
  const [isValidating, setIsValidating] = useState(false);
  
  // Use ref to track previous formData for deep comparison
  const previousFormDataRef = useRef<T | undefined>(undefined);
  
  // Memoize formData with deep comparison
  const memoizedFormData = useMemo(() => {
    const currentJson = JSON.stringify(formData);
    const previousJson = JSON.stringify(previousFormDataRef.current);
    
    if (currentJson !== previousJson) {
      previousFormDataRef.current = formData;
      return formData;
    }
    
    return previousFormDataRef.current || formData;
  }, [formData]);

  const computeStatus = useCallback(async (currentFormData: T) => {
    if (!enabled) return;
    
    setIsValidating(true);
    PerformanceMonitor.startMeasure(PERFORMANCE_MARKS.FORM_VALIDATION, 'status-computation');
    
    try {
      console.log('[useReactiveFormStatus] Running validation...');
      const isValid = await validator();
      const hasExistingData = hasDataChecker(currentFormData);
      const newStatus = determineFormStatus({ isValid, hasExistingData });
      console.log('[useReactiveFormStatus] Status computation:', {
        isValid,
        hasExistingData,
        newStatus: newStatus === FormStatus.Incomplete ? 'Incomplete' : 
                  newStatus === FormStatus.InProgress ? 'InProgress' : 
                  newStatus === FormStatus.Complete ? 'Complete' : 'Error'
      });
      setStatus(newStatus);
      
      const duration = PerformanceMonitor.endMeasure(PERFORMANCE_MARKS.FORM_VALIDATION, 'status-computation');
      if (duration > 100) {
        console.debug(`[Performance] Form validation took ${duration.toFixed(0)}ms`);
      }
    } catch (error) {
      console.log('[useReactiveFormStatus] Validation failed:', error);
      // If validation fails, consider form incomplete
      setStatus(FormStatus.Incomplete);
      PerformanceMonitor.endMeasure(PERFORMANCE_MARKS.FORM_VALIDATION, 'status-computation');
    } finally {
      setIsValidating(false);
    }
  }, [validator, hasDataChecker, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Debounce status computation to avoid excessive validation
    const timeoutId = setTimeout(() => {
      console.log('[useReactiveFormStatus] Computing status for:', memoizedFormData);
      computeStatus(memoizedFormData);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [computeStatus, debounceMs, enabled, memoizedFormData]);

  return status;
}

/**
 * Specialized hook for checklist forms
 */
export function useChecklistFormStatus(
  items: Array<{ value?: boolean; required?: boolean }> | undefined,
  trigger: () => Promise<boolean>,
  enabled = true
): FormStatus {
  return useReactiveFormStatus({
    formData: items || [],
    validator: trigger,
    hasDataChecker: (items) => items.some(item => item.value === true),
    enabled
  });
}

/**
 * Specialized hook for property description forms (simplified structure)
 */
export function usePropertyDescriptionFormStatus(
  propertyData: Record<string, any> | undefined,
  trigger: () => Promise<boolean>,
  enabled = true
): FormStatus {
  return useReactiveFormStatus({
    formData: propertyData || {},
    validator: trigger,
    hasDataChecker: (data) => {
      const hasData = Object.values(data).some(value => {
        if (typeof value === 'string') {
          return value.trim().length > 0;
        }
        if (typeof value === 'number') {
          return value > 0;
        }
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== null && value !== undefined;
      });
      console.log('[PropertyDescription] Has existing data:', hasData, 'from:', data);
      return hasData;
    },
    enabled
  });
}

/**
 * Specialized hook for element forms
 */
export function useElementFormStatus(
  elementData: { description?: string; images?: Array<any> },
  trigger: () => Promise<boolean>,
  enabled = true
): FormStatus {
  return useReactiveFormStatus({
    formData: elementData,
    validator: trigger,
    hasDataChecker: (data) => !!(data.description?.trim() || (data.images && data.images.length > 0)),
    enabled
  });
}

/**
 * Specialized hook for inspection forms
 */
export function useInspectionFormStatus(
  inspectionData: {
    location?: string;
    nameOverride?: string;
    additionalDescription?: string;
    ragStatus?: string;
    images?: Array<any>;
    conditions?: Array<any>;
    costings?: Array<any>;
  },
  trigger: () => Promise<boolean>,
  enabled = true
): FormStatus {
  return useReactiveFormStatus({
    formData: inspectionData,
    validator: trigger,
    hasDataChecker: (data) => {
      const hasData = !!(
        data.location?.trim() ||
        data.nameOverride?.trim() ||
        data.additionalDescription?.trim() ||
        (data.ragStatus && data.ragStatus !== "N/I") ||
        (data.images && data.images.length > 0) ||
        (data.conditions && data.conditions.length > 0) ||
        (data.costings && data.costings.length > 0)
      );
      console.log('[InspectionForm] Has existing data:', hasData, 'from:', data);
      console.log('[InspectionForm] Fields check:', {
        location: data.location?.trim(),
        nameOverride: data.nameOverride?.trim(), 
        additionalDescription: data.additionalDescription?.trim(),
        ragStatus: data.ragStatus,
        ragStatusValid: data.ragStatus && data.ragStatus !== "N/I",
        images: data.images?.length,
        conditions: data.conditions?.length,
        costings: data.costings?.length
      });
      return hasData;
    },
    enabled
  });
}

/**
 * Specialized hook for report details forms
 */
export function useReportDetailsFormStatus(
  reportData: {
    clientName?: string;
    reference?: string;
    weather?: string;
    orientation?: string;
    situation?: string;
    address?: any;
    level?: string;
    inspectionDate?: string | Date;
    reportDate?: string | Date;
    moneyShot?: Array<any>;
    frontElevationImagesUri?: Array<any>;
  },
  trigger: () => Promise<boolean>,
  enabled = true
): FormStatus {
  return useReactiveFormStatus({
    formData: reportData,
    validator: trigger,
    hasDataChecker: (data) => {
      const addressValue = typeof data.address === 'string' ? data.address : data.address?.formatted_address;
      
      return !!(
        data.clientName ||
        data.reference ||
        data.weather ||
        data.orientation ||
        data.situation ||
        addressValue ||
        data.level ||
        data.inspectionDate ||
        data.reportDate ||
        (data.moneyShot && data.moneyShot.length > 0) ||
        (data.frontElevationImagesUri && data.frontElevationImagesUri.length > 0)
      );
    },
    enabled
  });
}