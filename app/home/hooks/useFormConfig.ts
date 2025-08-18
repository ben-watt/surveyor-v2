/**
 * Shared form configuration constants and utilities
 */

export const FORM_CONFIG = {
  DEFAULT_MODE: 'onChange' as const,
  AUTOSAVE_DELAY: 1000, // 1 second
  VALIDATE_BEFORE_SAVE: false, // Allow saving partial/invalid data for autosave
} as const;

export interface AutosaveConfig {
  delay?: number;
  enabled?: boolean;
  validateBeforeSave?: boolean;
  showToast?: boolean;
}

export interface AutosaveConfigWithImages extends AutosaveConfig {
  imagePaths: string[];
}

export const DEFAULT_AUTOSAVE_CONFIG: AutosaveConfig = {
  delay: FORM_CONFIG.AUTOSAVE_DELAY,
  enabled: true,
  validateBeforeSave: FORM_CONFIG.VALIDATE_BEFORE_SAVE,
  showToast: false,
};

/**
 * Helper to create consistent form default values with validation mode
 */
export function createFormOptions<T>(defaultValues: T) {
  return {
    defaultValues,
    mode: FORM_CONFIG.DEFAULT_MODE,
  };
}

/**
 * Helper to create autosave configuration with defaults
 */
export function createAutosaveConfig(overrides: Partial<AutosaveConfig> = {}): AutosaveConfig {
  return {
    ...DEFAULT_AUTOSAVE_CONFIG,
    ...overrides,
  };
}

/**
 * Helper to create autosave configuration with images
 */
export function createAutosaveConfigWithImages(
  imagePaths: string[], 
  overrides: Partial<AutosaveConfig> = {}
): AutosaveConfigWithImages {
  return {
    ...DEFAULT_AUTOSAVE_CONFIG,
    ...overrides,
    imagePaths,
  };
}