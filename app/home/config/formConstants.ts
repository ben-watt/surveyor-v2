/**
 * Centralized configuration for form-related constants
 */

// Debounce delays (in milliseconds)
export const FORM_DEBOUNCE_DELAYS = {
  /** Delay for form status validation */
  STATUS_VALIDATION: 300,
  /** Delay for auto-save triggers */
  AUTO_SAVE: 2000,
  /** Delay for search inputs */
  SEARCH: 500,
  /** Delay for image upload status checks */
  UPLOAD_STATUS: 1000,
} as const;

// Form validation settings
export const FORM_VALIDATION = {
  /** Maximum retries for failed saves */
  MAX_SAVE_RETRIES: 3,
  /** Timeout for save operations (ms) */
  SAVE_TIMEOUT: 30000,
  /** Maximum file size for image uploads (MB) */
  MAX_IMAGE_SIZE_MB: 10,
  /** Allowed image formats */
  ALLOWED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;

// Performance monitoring settings
export const PERFORMANCE_MARKS = {
  /** Prefix for form render marks */
  FORM_RENDER: 'form-render',
  /** Prefix for form save marks */
  FORM_SAVE: 'form-save',
  /** Prefix for form validation marks */
  FORM_VALIDATION: 'form-validation',
  /** Prefix for image upload marks */
  IMAGE_UPLOAD: 'image-upload',
} as const;

// Auto-save settings
export const AUTO_SAVE_CONFIG = {
  /** Enable auto-save by default */
  ENABLED_BY_DEFAULT: true,
  /** Minimum interval between saves (ms) */
  MIN_SAVE_INTERVAL: 1000,
  /** Show save indicator */
  SHOW_INDICATOR: true,
  /** Persist unsaved changes in localStorage */
  PERSIST_UNSAVED: true,
} as const;

// Form status labels
export const FORM_STATUS_LABELS = {
  INCOMPLETE: 'Incomplete',
  IN_PROGRESS: 'In Progress', 
  COMPLETE: 'Complete',
  ERROR: 'Error',
  SAVING: 'Saving...',
  SAVED: 'Saved',
} as const;

// Sync settings
export const SYNC_CONFIG = {
  /** Sync interval for offline changes (ms) */
  SYNC_INTERVAL: 30000,
  /** Maximum items per sync batch */
  BATCH_SIZE: 50,
  /** Retry delay for failed syncs (ms) */
  RETRY_DELAY: 5000,
  /** Maximum sync retries */
  MAX_RETRIES: 5,
} as const;