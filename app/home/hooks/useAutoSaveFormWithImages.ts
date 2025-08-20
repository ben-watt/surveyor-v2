import { useCallback, useEffect, useState, useRef } from 'react';
import { FieldValues, UseFormWatch, UseFormGetValues, UseFormTrigger } from 'react-hook-form';
import { useAutoSaveForm } from './useAutoSaveForm';
import { AutoSaveOptions, AutoSaveResult } from './useAutoSave';
import { useImageUploadStatus } from '../components/InputImage/useImageUploadStatus';
import { imageUploadStatusStore } from '../components/InputImage/imageUploadStatusStore';
import { FORM_DEBOUNCE_DELAYS, PERFORMANCE_MARKS } from '@/app/home/config/formConstants';
import { PerformanceMonitor } from '@/app/home/utils/performanceMonitor';

interface AutoSaveFormWithImagesOptions extends AutoSaveOptions {
  imagePaths: string[];
  saveOnImageUpload?: boolean;
  watchChanges?: boolean;
  watchDelay?: number;
  skipFocusBlur?: boolean;
  validateBeforeSave?: boolean;
}

interface AutoSaveFormWithImagesResult<T> extends AutoSaveResult<T> {
  isUploading: boolean;
  uploadProgress: Record<string, boolean>;
  combinedStatus: 'idle' | 'pending' | 'saving' | 'uploading' | 'saved' | 'error' | 'autosaved';
  save: (data?: T, options?: { auto?: boolean }) => Promise<void>;
}

/**
 * Enhanced autosave hook that integrates with image upload monitoring
 * Triggers autosave when images finish uploading and provides combined status
 * 
 * @param saveFunction - Function that handles the actual saving logic
 * @param watch - react-hook-form's watch function
 * @param getValues - react-hook-form's getValues function
 * @param trigger - react-hook-form's trigger function for validation
 * @param options - Configuration options including image paths to monitor
 * @returns Enhanced AutoSaveResult with upload status and combined status
 */
export function useAutoSaveFormWithImages<T extends FieldValues>(
  saveFunction: (data: T, options?: { auto?: boolean }) => Promise<void>,
  watch: UseFormWatch<T>,
  getValues: UseFormGetValues<T>,
  trigger?: UseFormTrigger<T>,
  options: AutoSaveFormWithImagesOptions = { imagePaths: [] }
): AutoSaveFormWithImagesResult<T> {
  const { imagePaths, saveOnImageUpload = true, ...autoSaveOptions } = options;
  const { isUploading, isPathUploading } = useImageUploadStatus(imagePaths);
  
  const autoSave = useAutoSaveForm(saveFunction, watch, getValues, trigger, autoSaveOptions);

  console.log('[useAutoSaveFormWithImages] Hook initialized with paths:', imagePaths);

  // Track individual upload progress for each path
  const uploadProgress = imagePaths.reduce((acc, path) => {
    acc[path] = isPathUploading(path);
    return acc;
  }, {} as Record<string, boolean>);

  // Determine combined status based on upload and save status
  const combinedStatus = isUploading ? 'uploading' : autoSave.saveStatus;

  // Listen for upload completion using the imageUploadStatusStore directly
  useEffect(() => {
    if (!saveOnImageUpload || imagePaths.length === 0) return;

    console.log('[useAutoSaveFormWithImages] Setting up upload completion listener');

    const handleUploadChange = (isUploading: boolean, path: string) => {
      console.log('[useAutoSaveFormWithImages] Upload status changed:', { isUploading, path });
      
      // Only trigger autosave when upload completes (isUploading becomes false)
      if (!isUploading && imagePaths.includes(path)) {
        console.log('[useAutoSaveFormWithImages] Upload completed for path:', path);
        
        // Small delay to ensure the upload is fully processed
        setTimeout(() => {
          const currentData = getValues();
          autoSave.triggerAutoSave(currentData);
        }, 100);
      }
    };

    // Subscribe to upload status changes
    const unsubscribe = imageUploadStatusStore.subscribe(handleUploadChange);

    // Cleanup function
    return () => {
      console.log('[useAutoSaveFormWithImages] Cleaning up upload listener');
      unsubscribe();
    };
  }, [imagePaths, saveOnImageUpload]);

  // Enhanced save function that considers upload status
  const save = useCallback(async (data?: T, options?: { auto?: boolean }) => {
    const perfLabel = options?.auto ? 'auto-save' : 'manual-save';
    PerformanceMonitor.startMeasure(PERFORMANCE_MARKS.FORM_SAVE, perfLabel);
    
    console.log('[useAutoSaveFormWithImages] Save called:', {
      auto: options?.auto,
      isUploading,
      hasData: !!data
    });

    try {
      // For manual saves, we can proceed even if uploads are in progress
      // The form data will contain the image paths that are already available
      const currentData = data || getValues();
      const result = await autoSave.save(currentData, options);
      
      const duration = PerformanceMonitor.endMeasure(PERFORMANCE_MARKS.FORM_SAVE, perfLabel);
      if (duration > 1000) {
        console.warn(`[Performance] Slow save detected: ${duration.toFixed(0)}ms`);
      }
      
      return result;
    } catch (error) {
      PerformanceMonitor.endMeasure(PERFORMANCE_MARKS.FORM_SAVE, perfLabel);
      throw error;
    }
  }, [autoSave, getValues, isUploading]);

  return {
    ...autoSave,
    save,
    isUploading,
    uploadProgress,
    combinedStatus
  };
} 