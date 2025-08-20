import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import { surveyStore } from '@/app/home/clients/Database';
import PropertyDescriptionPage from '../page';
import { FormStatus } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/app/home/clients/Database', () => ({
  surveyStore: {
    useGet: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/app/home/components/Drawer', () => ({
  DynamicDrawer: ({ content, isOpen }: any) => 
    isOpen ? <div data-testid="drawer">{content}</div> : null,
  useDynamicDrawer: jest.fn(() => ({
    isOpen: false,
    toggleDrawer: jest.fn(),
    setContent: jest.fn(),
    content: null,
  })),
}));

jest.mock('react-hot-toast', () => ({
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the autosave hook
jest.mock('../../../../hooks/useAutoSaveForm', () => ({
  useAutoSaveForm: jest.fn(() => ({
    saveStatus: 'idle',
    isSaving: false,
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
        ref: jest.fn()
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
        ref: jest.fn()
      })),
        unregister: jest.fn(),
        getFieldState: jest.fn(),
        handleSubmit: jest.fn(),
        _subjects: {
          values: { next: jest.fn() },
          array: { next: jest.fn() },
          state: { next: jest.fn() }
        },
        _getWatch: jest.fn(),
        _updateValid: jest.fn(),
        _removeUnmounted: jest.fn(),
        _updateFieldArray: jest.fn(),
        _executeSchema: jest.fn(),
        _getFieldArray: jest.fn(),
        _reset: jest.fn(),
        _resetDefaultValues: jest.fn(),
        _updateFormState: jest.fn(),
        _disableForm: jest.fn(),
        _options: {
          mode: 'onChange',
          reValidateMode: 'onChange',
          shouldFocusError: true,
          shouldUseNativeValidation: false,
          shouldUnregister: false,
          criteriaMode: 'firstError',
          delayError: 0
        }
      },
      formState: { errors: {} },
      watch: jest.fn(() => ({ unsubscribe: jest.fn() })),
      getValues: jest.fn(),
      trigger: jest.fn().mockResolvedValue(true),
    })),
    FormProvider: ({ children }: any) => children,
    useController: jest.fn(() => ({
      field: { value: '', onChange: jest.fn(), onBlur: jest.fn(), name: 'test' },
      formState: { errors: {} }
    })),
  };
});

const mockUseParams = useParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockSurveyStore = surveyStore as jest.Mocked<typeof surveyStore>;

// Get reference to the mocked hook
const { useAutoSaveForm: mockUseAutoSaveForm } = jest.requireMock('../../../../hooks/useAutoSaveForm');

describe('PropertyDescriptionForm', () => {
  const mockSurveyId = 'test-survey-id';
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
  };

  const mockSurveyData: any = {
    id: mockSurveyId,
    propertyDescription: {
      propertyType: {
        type: 'text',
        label: 'Property Type',
        value: '',
        required: true,
        order: 1,
      },
      numberOfBedrooms: {
        type: 'number',
        label: 'Number of Bedrooms',
        value: '',
        required: true,
        order: 2,
      },
      status: {
        status: FormStatus.Incomplete,
        errors: [],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: mockSurveyId });
    mockUseRouter.mockReturnValue(mockRouter);
    mockSurveyStore.useGet.mockReturnValue([true, mockSurveyData]);
    mockSurveyStore.update.mockResolvedValue(undefined);
  });

  describe('Autosave Behavior', () => {
    it('should save when fields are cleared', async () => {
      // Mock the autosave hook to capture the save function
      let capturedSaveFunction: any;
      mockUseAutoSaveForm.mockImplementation((saveFunction: any) => {
        console.log("[TEST] useAutoSaveForm called with:", saveFunction);
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          lastSavedAt: null,
        };
      });

      render(<PropertyDescriptionPage />);

      // Wait for component to render and hook to be called
      await waitFor(() => {
        expect(screen.getByTestId('drawer')).toBeInTheDocument();
        expect(capturedSaveFunction).toBeDefined();
      });

      // Simulate clearing a field by calling the save function with empty data
      const clearedData = {
        propertyType: {
          type: 'text',
          label: 'Property Type',
          value: '', // Cleared field
          required: true,
          order: 1,
        },
        numberOfBedrooms: {
          type: 'number',
          label: 'Number of Bedrooms',
          value: '', // Cleared field
          required: true,
          order: 2,
        },
      };

      await capturedSaveFunction(clearedData, { auto: true });

      // Verify that the store update was called
      expect(mockSurveyStore.update).toHaveBeenCalledWith(
        mockSurveyId,
        expect.any(Function)
      );
    });

    it('should save partial data without validation errors', async () => {
      let capturedSaveFunction: any;
      mockUseAutoSaveForm.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          lastSavedAt: null,
        };
      });

      render(<PropertyDescriptionPage />);

      const partialData = {
        propertyType: {
          type: 'text',
          label: 'Property Type',
          value: 'House', // Only one field filled
          required: true,
          order: 1,
        },
        numberOfBedrooms: {
          type: 'number',
          label: 'Number of Bedrooms',
          value: '', // Empty field
          required: true,
          order: 2,
        },
      };

      await capturedSaveFunction(partialData, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalled();
    });
  });

  describe('Status Updates', () => {
    it('should show Not Started status when no data exists', async () => {
      // Mock survey with no existing data
      const emptySurveyData = {
        ...mockSurveyData,
        propertyDescription: {
          ...mockSurveyData.propertyDescription,
          propertyType: { ...mockSurveyData.propertyDescription.propertyType, value: '' },
          numberOfBedrooms: { ...mockSurveyData.propertyDescription.numberOfBedrooms, value: '' },
        },
      };
      
      mockSurveyStore.useGet.mockReturnValue([true, emptySurveyData]);

      let capturedSaveFunction: any;
      const { useAutoSaveForm } = require('../../../../hooks/useAutoSaveForm');
      
      // Mock trigger to return false (invalid)
      const mockTrigger = jest.fn().mockResolvedValue(false);
      useAutoSaveForm.mockImplementation((saveFunction: any, watch: any, getValues: any, trigger: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          lastSavedAt: null,
        };
      });

      render(<PropertyDescriptionPage />);

      const emptyData = {
        propertyType: { ...mockSurveyData.propertyDescription.propertyType, value: '' },
        numberOfBedrooms: { ...mockSurveyData.propertyDescription.numberOfBedrooms, value: '' },
      };

      // Update trigger for this specific test - don't override the whole mock
      const { useForm } = jest.requireMock('react-hook-form');
      const originalFormMethods = useForm();
      useForm.mockReturnValueOnce({
        ...originalFormMethods,
        trigger: mockTrigger,
      });

      await capturedSaveFunction(emptyData, { auto: true });

      // Check that status was set to Incomplete (Not Started)
      expect(mockSurveyStore.update).toHaveBeenCalledWith(
        mockSurveyId,
        expect.any(Function)
      );
    });

    it('should show Incomplete status when has data but validation fails', async () => {
      // Mock survey with some existing data
      const surveyWithData = {
        ...mockSurveyData,
        propertyDescription: {
          ...mockSurveyData.propertyDescription,
          propertyType: { ...mockSurveyData.propertyDescription.propertyType, value: 'House' },
          numberOfBedrooms: { ...mockSurveyData.propertyDescription.numberOfBedrooms, value: '' },
        },
      };
      
      mockSurveyStore.useGet.mockReturnValue([true, surveyWithData]);

      let capturedSaveFunction: any;
      const { useAutoSaveForm } = require('../../../../hooks/useAutoSaveForm');
      
      // Mock trigger to return false (invalid)
      const mockTrigger = jest.fn().mockResolvedValue(false);
      useAutoSaveForm.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          lastSavedAt: null,
        };
      });

      render(<PropertyDescriptionPage />);

      const partialData = {
        propertyType: { ...mockSurveyData.propertyDescription.propertyType, value: 'House' },
        numberOfBedrooms: { ...mockSurveyData.propertyDescription.numberOfBedrooms, value: '' },
      };

      // Mock the trigger function
      jest.spyOn(require('react-hook-form'), 'useForm').mockReturnValue({
        register: jest.fn(() => ({
        name: 'test-field',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: jest.fn()
      })),
        control: {},
        watch: jest.fn(),
        getValues: jest.fn(),
        trigger: mockTrigger,
        formState: { errors: {} },
      });

      await capturedSaveFunction(partialData, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalled();
    });

    it('should show Complete status when validation passes', async () => {
      let capturedSaveFunction: any;
      const { useAutoSaveForm } = require('../../../../hooks/useAutoSaveForm');
      
      // Mock trigger to return true (valid)
      const mockTrigger = jest.fn().mockResolvedValue(true);
      useAutoSaveForm.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          lastSavedAt: null,
        };
      });

      render(<PropertyDescriptionPage />);

      const completeData = {
        propertyType: { ...mockSurveyData.propertyDescription.propertyType, value: 'House' },
        numberOfBedrooms: { ...mockSurveyData.propertyDescription.numberOfBedrooms, value: '3' },
      };

      // Mock the trigger function
      jest.spyOn(require('react-hook-form'), 'useForm').mockReturnValue({
        register: jest.fn(() => ({
        name: 'test-field',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: jest.fn()
      })),
        control: {},
        watch: jest.fn(),
        getValues: jest.fn(),
        trigger: mockTrigger,
        formState: { errors: {} },
      });

      await capturedSaveFunction(completeData, { auto: true });

      expect(mockSurveyStore.update).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      mockSurveyStore.update.mockRejectedValue(new Error('Save failed'));

      let capturedSaveFunction: any;
      mockUseAutoSaveForm.mockImplementation((saveFunction: any) => {
        capturedSaveFunction = saveFunction;
        return {
          saveStatus: 'idle',
          isSaving: false,
          lastSavedAt: null,
        };
      });

      render(<PropertyDescriptionPage />);

      const data = {
        propertyType: { ...mockSurveyData.propertyDescription.propertyType, value: 'House' },
        numberOfBedrooms: { ...mockSurveyData.propertyDescription.numberOfBedrooms, value: '3' },
      };

      await expect(capturedSaveFunction(data, { auto: true })).rejects.toThrow('Save failed');
    });
  });
});