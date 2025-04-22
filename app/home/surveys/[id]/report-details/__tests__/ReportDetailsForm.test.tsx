import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ReportDetailsForm from '../ReportDetailsForm';
import { FormStatus } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { surveyStore } from '@/app/home/clients/Database';
import { useImageUploadStatus } from '@/app/home/components/InputImage/useImageUploadStatus';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/app/home/clients/Database', () => ({
  surveyStore: {
    update: jest.fn().mockResolvedValue(undefined),
  },
}));

// Create shared test values for the useImageUploadStatus hook
const createMockHookState = (isUploading = false) => {
  // Create a stateful mock that can be updated
  const mockState = {
    isUploading,
    uploaded: false,
  };
  
  return {
    state: mockState,
    hookValue: {
      isUploading: mockState.isUploading,
      checkUploadStatus: jest.fn(() => mockState.isUploading),
      isPathUploading: jest.fn((path) => mockState.isUploading),
    },
    // Function to update the mock state and hook return values
    update: (newIsUploading: boolean) => {
      mockState.isUploading = newIsUploading;
      mockState.uploaded = !newIsUploading;
      return {
        isUploading: mockState.isUploading,
        checkUploadStatus: jest.fn(() => mockState.isUploading),
        isPathUploading: jest.fn((path) => mockState.isUploading),
      };
    },
  };
};

// Mock the useImageUploadStatus hook
jest.mock('@/app/home/components/InputImage/useImageUploadStatus', () => ({
  useImageUploadStatus: jest.fn(),
}));

jest.mock('@/app/home/components/Drawer', () => ({
  useDynamicDrawer: () => ({
    closeDrawer: jest.fn(),
  }),
}));

// Mock complex UI components
jest.mock('@/app/home/components/Input/AddressInput', () => ({
  __esModule: true,
  default: ({ labelTitle }: any) => (
    <div>
      <div>
        <label>
          <span className="text-sm">{labelTitle}</span>
        </label>
      </div>
      <input aria-label={labelTitle} />
    </div>
  ),
}));

jest.mock('@/app/home/components/Input/ComboBox', () => ({
  Combobox: ({ labelTitle, data }: any) => (
    <div>
      <label>
        <span className="text-sm">{labelTitle}</span>
      </label>
      <select aria-label={labelTitle}>
        {data.map((item: any) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

jest.mock('@/app/home/components/Input/InputText', () => ({
  __esModule: true,
  default: ({ labelTitle, register }: any) => {
    const reg = register ? register() : {};
    return (
      <div>
        <label>
          <span className="text-sm">{labelTitle}</span>
        </label>
        <input aria-label={labelTitle} {...reg} />
      </div>
    );
  },
}));

jest.mock('@/app/home/components/Input/InputDate', () => ({
  __esModule: true,
  default: ({ labelTitle }: any) => (
    <div>
      <label>
        <span className="text-sm">{labelTitle}</span>
      </label>
      <input type="date" aria-label={labelTitle} />
    </div>
  ),
}));

jest.mock('@/app/home/components/Input/TextAreaInput', () => ({
  __esModule: true,
  default: ({ labelTitle, register }: any) => {
    const reg = register ? register() : {};
    return (
      <div>
        <label>
          <span className="text-sm">{labelTitle}</span>
        </label>
        <textarea aria-label={labelTitle} {...reg} />
      </div>
    );
  },
}));

// Mock RhfInputImage component to prevent actual uploads in tests
jest.mock('@/app/home/components/InputImage', () => ({
  RhfInputImage: ({ labelText, rhfProps, path }: any) => (
    <div data-testid={`rhf-input-image-${rhfProps.name}`}>
      <label>{labelText}</label>
      <input 
        type="file" 
        name={rhfProps.name} 
        data-path={path}
        onChange={() => {}}
      />
    </div>
  ),
}));

describe('ReportDetailsForm', () => {
  const mockSurveyId = 'test-survey-123';
  // Mock with all required ReportDetails fields
  const mockReportDetails = {
    clientName: 'Test Client',
    address: {
      formatted: '123 Test St, Test City, TE1 1ST',
      line1: '123 Test St',
      city: 'Test City',
      postcode: 'TE1 1ST',
      location: { lat: 51.5, lng: -0.1 }
    },
    level: "2" as const,
    reportDate: new Date() as unknown as Date,
    inspectionDate: new Date() as unknown as Date,
    weather: 'Sunny',
    orientation: 'North facing',
    situation: 'Urban area',
    moneyShot: ['/path/to/image1.jpg'],
    frontElevationImagesUri: ['/path/to/image2.jpg'],
    status: { status: FormStatus.Incomplete, errors: [] }
  };

  let mockHook: ReturnType<typeof createMockHookState>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh mock hook state with no uploads by default
    mockHook = createMockHookState(false);
    
    // Set up the default mock implementation
    (useImageUploadStatus as jest.Mock).mockReturnValue(mockHook.hookValue);
    
    // Reset surveyStore mock
    (surveyStore.update as jest.Mock).mockClear();
  });

  it('allows form submission when no images are uploading', async () => {
    render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);
    
    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    
    // Check that the form submission is allowed
    expect(surveyStore.update).toHaveBeenCalled();
  });

  it('prevents form submission when images are uploading', async () => {
    // Set up that images are uploading
    (useImageUploadStatus as jest.Mock).mockReturnValue(mockHook.update(true));
    
    render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);
    
    // Check that the warning is displayed
    expect(screen.getByText(/Images are currently uploading/i)).toBeInTheDocument();
    
    // Check that the submit button is disabled and has the right text
    const submitButton = screen.getByRole('button', { name: /images uploading/i });
    expect(submitButton).toBeDisabled();
    
    // Try to submit the form (even though button is disabled)
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Check that the form submission was prevented
    expect(surveyStore.update).not.toHaveBeenCalled();
  });

  it('disables the submit button when uploads are in progress', () => {
    // Mock that uploads are in progress
    (useImageUploadStatus as jest.Mock).mockReturnValue(mockHook.update(true));
    
    render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);
    
    // Verify button is disabled with "Images Uploading..." text
    const submitButton = screen.getByRole('button', { name: /Images Uploading/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton.textContent).toBe('Images Uploading...');
  });

  it('enables the submit button when no uploads are in progress', () => {
    // Mock that no uploads are in progress
    (useImageUploadStatus as jest.Mock).mockReturnValue(mockHook.update(false));
    
    render(<ReportDetailsForm surveyId={mockSurveyId} reportDetails={mockReportDetails} />);
    
    // Verify button is enabled with "Save" text
    const submitButton = screen.getByRole('button', { name: /Save/i });
    expect(submitButton).not.toBeDisabled();
    expect(submitButton.textContent).toBe('Save');
  });
}); 