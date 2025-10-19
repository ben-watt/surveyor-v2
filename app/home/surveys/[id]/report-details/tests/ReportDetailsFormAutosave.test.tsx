import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportDetailsForm from '../ReportDetailsForm';
import { FormStatus } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { surveyStore } from '@/app/home/clients/Database';

// Mock dependencies
jest.mock('@/app/home/clients/Database', () => ({
  surveyStore: {
    update: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/app/home/components/Drawer', () => ({
  useDynamicDrawer: jest.fn(() => ({
    closeDrawer: jest.fn(),
  })),
}));

// Mock the autosave hook
jest.mock('@/app/home/hooks/useAutoSaveFormWithImages', () => ({
  useAutoSaveFormWithImages: jest.fn(() => ({
    saveStatus: 'idle',
    isSaving: false,
    isUploading: false,
    lastSavedAt: null,
  })),
}));

// Mock @hookform/error-message
jest.mock('@hookform/error-message', () => ({
  ErrorMessage: ({ name, errors, render }: any) => {
    const error = errors && errors[name];
    return error ? render({ message: error.message || 'Error' }) : null;
  },
}));

// Mock react-hook-form
jest.mock('react-hook-form', () => {
  const originalModule = jest.requireActual('react-hook-form');
  return {
    ...originalModule,
    useForm: jest.fn(() => ({
      register: jest.fn(() => ({
        name: 'test-field',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: jest.fn(),
      })),
      control: {
        _formState: { errors: {} },
        _fields: {},
        _defaultValues: {},
        _formValues: {},
        _stateFlags: { isSubmitted: false, isDirty: false },
        register: jest.fn(() => ({
          name: 'test-field',
          onChange: jest.fn(),
          onBlur: jest.fn(),
          ref: jest.fn(),
        })),
        unregister: jest.fn(),
        getFieldState: jest.fn(),
        handleSubmit: jest.fn(),
        _subjects: {
          values: { next: jest.fn() },
          array: { next: jest.fn() },
          state: { next: jest.fn() },
        },
      },
      formState: { errors: {} },
      watch: jest.fn(() => ({ unsubscribe: jest.fn() })),
      getValues: jest.fn(),
      trigger: jest.fn().mockResolvedValue(true),
    })),
    FormProvider: ({ children }: any) => children,
    useController: jest.fn(() => ({
      field: { value: '', onChange: jest.fn(), onBlur: jest.fn(), name: 'test' },
      formState: { errors: {} },
    })),
  };
});

const mockSurveyStore = surveyStore as jest.Mocked<typeof surveyStore>;

describe('ReportDetailsForm Autosave', () => {
  const mockSurveyId = 'test-survey-id';

  const mockReportDetails: any = {
    clientName: 'Test Client',
    reference: 'REF123',
    weather: 'Sunny',
    orientation: 'North facing',
    situation: 'Test situation',
    address: 'Test Address',
    level: '2',
    inspectionDate: new Date('2024-01-01'),
    reportDate: new Date('2024-01-02'),
    moneyShot: [],
    frontElevationImagesUri: [],
    status: {
      status: FormStatus.Complete,
      errors: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSurveyStore.update.mockResolvedValue(undefined);
  });

  describe('Autosave with useAutoSaveFormWithImages', () => {
    it('should save when fields are cleared', async () => {
      let capturedSaveFunction: any;
      const { useAutoSaveFormWithImages } = require('@/app/home/hooks/useAutoSaveFormWithImages');
      useAutoSaveFormWithImages.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          isUploading: false,
          lastSavedAt: null,
        };
      });

      render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);

      // Simulate clearing all fields
      const clearedData = {
        ...mockReportDetails,
        clientName: '', // Cleared
        reference: '', // Cleared
        weather: '', // Cleared
        orientation: '', // Cleared
        situation: '', // Cleared
      };

      await capturedSaveFunction(clearedData, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalledWith(mockSurveyId, expect.any(Function));
    });

    it('should save partial data without validation blocking', async () => {
      let capturedSaveFunction: any;
      const { useAutoSaveFormWithImages } = require('@/app/home/hooks/useAutoSaveFormWithImages');
      useAutoSaveFormWithImages.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          isUploading: false,
          lastSavedAt: null,
        };
      });

      render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);

      // Simulate partial data (some required fields missing)
      const partialData = {
        ...mockReportDetails,
        clientName: 'Test Client',
        reference: '', // Missing required field
        weather: 'Sunny',
        orientation: '', // Missing required field
        situation: 'Test situation',
      };

      await capturedSaveFunction(partialData, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalled();
    });
  });

  describe('Status Logic', () => {
    it('should set InProgress status when has existing data but validation fails', async () => {
      let capturedSaveFunction: any;
      const { useAutoSaveFormWithImages } = require('@/app/home/hooks/useAutoSaveFormWithImages');

      // Mock trigger to return false (validation fails)
      const mockTrigger = jest.fn().mockResolvedValue(false);
      useAutoSaveFormWithImages.mockImplementation(
        (saveFunction: any, watch: any, getValues: any, trigger: any) => {
          capturedSaveFunction = saveFunction;
          return {
            saveStatus: 'idle',
            isSaving: false,
            isUploading: false,
            lastSavedAt: null,
          };
        },
      );

      render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);

      // Update trigger for this specific test
      const { useForm } = jest.requireMock('react-hook-form');
      useForm.mockReturnValueOnce({
        ...useForm(),
        trigger: mockTrigger,
      });

      const dataWithExistingValues = {
        ...mockReportDetails,
        clientName: 'Test Client', // Has data
        reference: '', // Missing required field
      };

      await capturedSaveFunction(dataWithExistingValues, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalled();
    });

    it('should set Incomplete status when no existing data and validation fails', async () => {
      const emptyReportDetails: any = {
        clientName: '',
        reference: '',
        weather: '',
        orientation: '',
        situation: '',
        address: '',
        level: '',
        inspectionDate: null,
        reportDate: null,
        moneyShot: [],
        frontElevationImagesUri: [],
        status: {
          status: FormStatus.Incomplete,
          errors: [],
        },
      };

      let capturedSaveFunction: any;
      const { useAutoSaveFormWithImages } = require('@/app/home/hooks/useAutoSaveFormWithImages');

      // Mock trigger to return false (validation fails)
      const mockTrigger = jest.fn().mockResolvedValue(false);
      useAutoSaveFormWithImages.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          isUploading: false,
          lastSavedAt: null,
        };
      });

      render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={emptyReportDetails} />);

      // Update trigger for this specific test
      const { useForm } = jest.requireMock('react-hook-form');
      useForm.mockReturnValueOnce({
        ...useForm(),
        trigger: mockTrigger,
      });

      await capturedSaveFunction(emptyReportDetails, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalled();
    });

    it('should set Complete status when validation passes', async () => {
      let capturedSaveFunction: any;
      const { useAutoSaveFormWithImages } = require('@/app/home/hooks/useAutoSaveFormWithImages');

      // Mock trigger to return true (validation passes)
      const mockTrigger = jest.fn().mockResolvedValue(true);
      useAutoSaveFormWithImages.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          isUploading: false,
          lastSavedAt: null,
        };
      });

      render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);

      // Update trigger for this specific test
      const { useForm } = jest.requireMock('react-hook-form');
      useForm.mockReturnValueOnce({
        ...useForm(),
        trigger: mockTrigger,
      });

      await capturedSaveFunction(mockReportDetails, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors and update status accordingly', async () => {
      // Mock the first call to fail (the main save), then the second call to succeed (error status update)
      mockSurveyStore.update
        .mockRejectedValueOnce(new Error('Network error')) // First call fails (the save)
        .mockResolvedValueOnce(undefined); // Second call succeeds (error status update)

      let capturedSaveFunction: any;
      const { useAutoSaveFormWithImages } = require('@/app/home/hooks/useAutoSaveFormWithImages');
      useAutoSaveFormWithImages.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          isUploading: false,
          lastSavedAt: null,
        };
      });

      render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);

      await expect(capturedSaveFunction(mockReportDetails, { auto: true })).rejects.toThrow(
        'Network error',
      );

      // Should attempt to update status to Error
      expect(mockSurveyStore.update).toHaveBeenCalledWith(mockSurveyId, expect.any(Function));
    });
  });
});
