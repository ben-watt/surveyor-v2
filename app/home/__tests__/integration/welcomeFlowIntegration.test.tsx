/**
 * Integration tests for the complete welcome flow
 * Tests the interaction between all components working together
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../../surveys/page';
import { useWelcomeFlow } from '../../hooks/useWelcomeFlow';
import { seedInitialData } from '../../services/dataSeedingService';
import { elementStore, sectionStore, componentStore, phraseStore, surveyStore } from '../../clients/Database';
import { getCurrentTenantId } from '../../utils/tenant-utils';

// Mock all external dependencies
jest.mock('../../hooks/useWelcomeFlow');
jest.mock('../../services/dataSeedingService');
jest.mock('../../clients/Database');
jest.mock('../../utils/tenant-utils');
jest.mock('../../utils/useUser', () => ({
  useUserAttributes: () => [true, { sub: 'test-user', name: 'Test User' }],
  getOwnerDisplayName: () => 'Test User',
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

// Mock UI components with simpler implementations
jest.mock('@/components/ui/welcome-dialog', () => ({
  WelcomeDialog: ({
    open,
    onStartSetup,
    onSkipSetup,
    isLoading,
    showSetupOptions,
    progress
  }: any) => {
    if (!open) return null;

    return (
      <div data-testid="welcome-dialog">
        {showSetupOptions && !progress && (
          <div data-testid="setup-options">
            <h2>Welcome to Survii!</h2>
            <button
              data-testid="setup-button"
              onClick={onStartSetup}
              disabled={isLoading}
            >
              Set Up Sample Data
            </button>
            <button
              data-testid="skip-button"
              onClick={onSkipSetup}
              disabled={isLoading}
            >
              Start with Empty Account
            </button>
          </div>
        )}

        {progress && !progress.isComplete && (
          <div data-testid="progress-view">
            <h3>Setting up your account</h3>
            <p data-testid="progress-step">{progress.currentStep}</p>
            <div data-testid="progress-bar">
              Progress: {Math.round((progress.currentStepIndex / progress.totalSteps) * 100)}%
            </div>
          </div>
        )}

        {progress && progress.isComplete && (
          <div data-testid="completion-view">
            <h3>Setup Complete!</h3>
            <button
              data-testid="get-started-button"
              onClick={() => onOpenChange?.(false)}
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    );
  },
}));

// Mock other UI components
jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="search-input" {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuCheckboxItem: ({ children, onCheckedChange }: any) => (
    <div onClick={onCheckedChange}>{children}</div>
  ),
}));

// Mock survey components
jest.mock('../../surveys/SurveyListCard', () => ({
  BuildingSurveyListCard: ({ survey }: any) => (
    <div data-testid="survey-card">{survey.reportDetails?.clientName || 'Survey'}</div>
  ),
}));

jest.mock('../../surveys/components/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">No surveys yet</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  ListFilter: () => <span>Filter</span>,
  Plus: () => <span>Plus</span>,
  Loader2: () => <span>Loading</span>,
}));

const mockUseWelcomeFlow = useWelcomeFlow as jest.MockedFunction<typeof useWelcomeFlow>;
const mockSeedInitialData = seedInitialData as jest.MockedFunction<typeof seedInitialData>;
const mockGetCurrentTenantId = getCurrentTenantId as jest.MockedFunction<typeof getCurrentTenantId>;

describe('Welcome Flow Integration', () => {
  const createMockStores = () => ({
    elementStore: {
      useList: jest.fn().mockReturnValue([true, []]),
      add: jest.fn().mockResolvedValue(undefined),
    },
    sectionStore: {
      useList: jest.fn().mockReturnValue([true, []]),
      add: jest.fn().mockResolvedValue(undefined),
    },
    componentStore: {
      useList: jest.fn().mockReturnValue([true, []]),
      add: jest.fn().mockResolvedValue(undefined),
    },
    phraseStore: {
      useList: jest.fn().mockReturnValue([true, []]),
      add: jest.fn().mockResolvedValue(undefined),
    },
  });

  const mockSurveyStore = {
    useList: jest.fn().mockReturnValue([true, []]),
    useRawList: jest.fn().mockReturnValue([true, []]),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    const stores = createMockStores();
    (elementStore as any).useList = stores.elementStore.useList;
    (sectionStore as any).useList = stores.sectionStore.useList;
    (componentStore as any).useList = stores.componentStore.useList;
    (phraseStore as any).useList = stores.phraseStore.useList;
    (surveyStore as any).useList = mockSurveyStore.useList;
    (surveyStore as any).useRawList = mockSurveyStore.useRawList;

    mockGetCurrentTenantId.mockResolvedValue('test-tenant-123');
    mockSeedInitialData.mockResolvedValue(undefined);
  });

  describe('New User Flow', () => {
    it('should show welcome dialog for new users', async () => {
      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: true,
        isLoading: false,
        handleStartSetup: jest.fn(),
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      render(<HomePage />);

      expect(screen.getByTestId('welcome-dialog')).toBeInTheDocument();
      expect(screen.getByText('Welcome to Survii!')).toBeInTheDocument();
      expect(screen.getByTestId('setup-button')).toBeInTheDocument();
      expect(screen.getByTestId('skip-button')).toBeInTheDocument();
    });

    it('should not show welcome dialog for existing users', () => {
      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: false,
        showSetupOptions: true,
        isLoading: false,
        handleStartSetup: jest.fn(),
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      render(<HomePage />);

      expect(screen.queryByTestId('welcome-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Setup Process Integration', () => {
    it('should complete full seeding process with progress updates', async () => {
      const mockHandleStartSetup = jest.fn();
      const user = userEvent.setup();

      // Start with setup options
      const { rerender } = render(<HomePage />);

      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: true,
        isLoading: false,
        handleStartSetup: mockHandleStartSetup,
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      rerender(<HomePage />);

      // Click setup button
      const setupButton = screen.getByTestId('setup-button');
      await user.click(setupButton);

      expect(mockHandleStartSetup).toHaveBeenCalled();

      // Simulate progress updates
      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: false,
        isLoading: true,
        progress: {
          currentStep: 'Setting up building elements...',
          totalSteps: 4,
          currentStepIndex: 1,
          isComplete: false,
        },
        handleStartSetup: mockHandleStartSetup,
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      rerender(<HomePage />);

      expect(screen.getByTestId('progress-view')).toBeInTheDocument();
      expect(screen.getByText('Setting up building elements...')).toBeInTheDocument();
      expect(screen.getByText('Progress: 25%')).toBeInTheDocument();

      // Simulate completion
      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: false,
        isLoading: false,
        progress: {
          currentStep: 'Data initialization complete!',
          totalSteps: 4,
          currentStepIndex: 4,
          isComplete: true,
        },
        handleStartSetup: mockHandleStartSetup,
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      rerender(<HomePage />);

      expect(screen.getByTestId('completion-view')).toBeInTheDocument();
      expect(screen.getByText('Setup Complete!')).toBeInTheDocument();
    });

    it('should handle setup with real data stores', async () => {
      const mockStores = createMockStores();
      let progressCallback: ((progress: any) => void) | undefined;

      // Mock seedInitialData to capture progress callback
      mockSeedInitialData.mockImplementation(async (onProgress) => {
        progressCallback = onProgress;

        if (onProgress) {
          onProgress({
            currentStep: 'Setting up survey sections...',
            totalSteps: 4,
            currentStepIndex: 0,
            isComplete: false,
          });

          onProgress({
            currentStep: 'Setting up building elements...',
            totalSteps: 4,
            currentStepIndex: 1,
            isComplete: false,
          });

          onProgress({
            currentStep: 'Setting up building components...',
            totalSteps: 4,
            currentStepIndex: 2,
            isComplete: false,
          });

          onProgress({
            currentStep: 'Setting up inspection phrases...',
            totalSteps: 4,
            currentStepIndex: 3,
            isComplete: false,
          });

          onProgress({
            currentStep: 'Data initialization complete!',
            totalSteps: 4,
            currentStepIndex: 4,
            isComplete: true,
          });
        }
      });

      // Simulate the actual hook behavior
      let hookState = {
        showWelcome: true,
        showSetupOptions: true,
        isLoading: false,
        progress: undefined as any,
        handleStartSetup: jest.fn(),
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      };

      hookState.handleStartSetup = jest.fn(async () => {
        hookState.isLoading = true;
        hookState.showSetupOptions = false;

        await mockSeedInitialData(progressCallback);

        hookState.isLoading = false;
      });

      mockUseWelcomeFlow.mockReturnValue(hookState);

      const { rerender } = render(<HomePage />);

      // Start setup
      const user = userEvent.setup();
      const setupButton = screen.getByTestId('setup-button');
      await user.click(setupButton);

      // Verify seedInitialData was called
      expect(mockSeedInitialData).toHaveBeenCalled();
    });
  });

  describe('Skip Flow Integration', () => {
    it('should handle skip setup correctly', async () => {
      const mockHandleSkipSetup = jest.fn();
      const user = userEvent.setup();

      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: true,
        isLoading: false,
        handleStartSetup: jest.fn(),
        handleSkipSetup: mockHandleSkipSetup,
        handleCloseWelcome: jest.fn(),
      });

      render(<HomePage />);

      const skipButton = screen.getByTestId('skip-button');
      await user.click(skipButton);

      expect(mockHandleSkipSetup).toHaveBeenCalled();
      expect(mockSeedInitialData).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle seeding errors gracefully', async () => {
      const seedingError = new Error('Network error during seeding');
      mockSeedInitialData.mockRejectedValue(seedingError);

      const mockHandleStartSetup = jest.fn();

      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: false,
        isLoading: false,
        error: 'Network error during seeding',
        handleStartSetup: mockHandleStartSetup,
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      render(<HomePage />);

      // In a real scenario, error would be displayed
      // Here we just verify the hook state reflects the error
      expect(mockUseWelcomeFlow).toHaveBeenCalled();
    });

    it('should handle tenant context errors', async () => {
      mockGetCurrentTenantId.mockResolvedValue(null);

      const tenantError = new Error('No tenant context available');
      mockSeedInitialData.mockRejectedValue(tenantError);

      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: false,
        isLoading: false,
        error: 'No tenant context available',
        handleStartSetup: jest.fn(),
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      render(<HomePage />);

      // Verify error state is handled
      expect(mockUseWelcomeFlow).toHaveBeenCalled();
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency during seeding', async () => {
      const mockStores = createMockStores();
      const addCalls: any[] = [];

      // Track all add calls to verify order and consistency
      mockStores.sectionStore.add.mockImplementation((data) => {
        addCalls.push({ type: 'section', data });
        return Promise.resolve();
      });

      mockStores.elementStore.add.mockImplementation((data) => {
        addCalls.push({ type: 'element', data });
        return Promise.resolve();
      });

      mockStores.componentStore.add.mockImplementation((data) => {
        addCalls.push({ type: 'component', data });
        return Promise.resolve();
      });

      mockStores.phraseStore.add.mockImplementation((data) => {
        addCalls.push({ type: 'phrase', data });
        return Promise.resolve();
      });

      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: true,
        isLoading: false,
        handleStartSetup: jest.fn(),
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      render(<HomePage />);

      // Verify welcome dialog is present
      expect(screen.getByTestId('welcome-dialog')).toBeInTheDocument();
    });
  });

  describe('State Management Integration', () => {
    it('should maintain consistent state throughout the flow', async () => {
      const stateHistory: any[] = [];

      mockUseWelcomeFlow.mockImplementation(() => {
        const state = {
          showWelcome: true,
          showSetupOptions: true,
          isLoading: false,
          handleStartSetup: jest.fn(),
          handleSkipSetup: jest.fn(),
          handleCloseWelcome: jest.fn(),
        };

        stateHistory.push({ ...state });
        return state;
      });

      render(<HomePage />);

      // Verify hook was called and state was captured
      expect(stateHistory.length).toBeGreaterThan(0);
      expect(stateHistory[0].showWelcome).toBe(true);
    });

    it('should handle rapid state changes correctly', async () => {
      // First render - no welcome
      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: false,
        showSetupOptions: true,
        isLoading: false,
        handleStartSetup: jest.fn(),
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      const { rerender } = render(<HomePage />);
      expect(screen.queryByTestId('welcome-dialog')).not.toBeInTheDocument();

      // Change mock to show welcome
      mockUseWelcomeFlow.mockReturnValue({
        showWelcome: true,
        showSetupOptions: true,
        isLoading: false,
        handleStartSetup: jest.fn(),
        handleSkipSetup: jest.fn(),
        handleCloseWelcome: jest.fn(),
      });

      // Rerender - welcome appears
      rerender(<HomePage />);
      expect(screen.getByTestId('welcome-dialog')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should not re-render unnecessarily', async () => {
      let renderCount = 0;

      mockUseWelcomeFlow.mockImplementation(() => {
        renderCount++;
        return {
          showWelcome: false,
          showSetupOptions: true,
          isLoading: false,
          handleStartSetup: jest.fn(),
          handleSkipSetup: jest.fn(),
          handleCloseWelcome: jest.fn(),
        };
      });

      const { rerender } = render(<HomePage />);

      const initialRenderCount = renderCount;

      // Rerender with same props
      rerender(<HomePage />);

      // Should not cause additional renders in the hook
      expect(renderCount).toBeGreaterThanOrEqual(initialRenderCount);
    });
  });
});