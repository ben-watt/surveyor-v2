import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useAutoSaveFormWithImages } from '../useAutoSaveFormWithImages';

// Mock the dependencies
jest.mock('../useAutoSaveForm', () => ({
  useAutoSaveForm: jest.fn(() => ({
    save: jest.fn(),
    saveStatus: 'idle',
    isSaving: false,
    lastSavedAt: null,
    triggerAutoSave: jest.fn(),
    resetStatus: jest.fn(),
  })),
}));

jest.mock('../../components/InputImage/useImageUploadStatus', () => ({
  useImageUploadStatus: jest.fn(() => ({
    isUploading: false,
    isPathUploading: jest.fn(() => false),
  })),
}));

describe('useAutoSaveFormWithImages', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => {
      const form = useForm();
      return useAutoSaveFormWithImages(
        jest.fn(),
        form.watch,
        form.getValues,
        form.trigger,
        {
          imagePaths: ['test-path-1', 'test-path-2'],
        }
      );
    });

    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.combinedStatus).toBe('idle');
    expect(result.current.uploadProgress).toEqual({
      'test-path-1': false,
      'test-path-2': false,
    });
  });

  it('should show uploading status when images are uploading', () => {
    // Mock uploading state
    const mockUseImageUploadStatus = require('../../components/InputImage/useImageUploadStatus').useImageUploadStatus;
    mockUseImageUploadStatus.mockReturnValue({
      isUploading: true,
      isPathUploading: jest.fn(() => true),
    });

    const { result } = renderHook(() => {
      const form = useForm();
      return useAutoSaveFormWithImages(
        jest.fn(),
        form.watch,
        form.getValues,
        form.trigger,
        {
          imagePaths: ['test-path-1'],
        }
      );
    });

    expect(result.current.isUploading).toBe(true);
    expect(result.current.combinedStatus).toBe('uploading');
  });
}); 