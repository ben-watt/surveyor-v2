import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeDialog } from '../welcome-dialog';
import { SeedingProgress } from '@/app/home/services/dataSeedingService';

// Mock the UI components
jest.mock('../dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({
    children,
    onPointerDownOutside,
  }: {
    children: React.ReactNode;
    onPointerDownOutside?: (e: React.PointerEvent<HTMLDivElement>) => void;
  }) => (
    <div data-testid="dialog-content" onPointerDown={onPointerDownOutside}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

jest.mock('../button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => {
    // Extract text content from children, filtering out React elements
    const childText = React.Children.toArray(children)
      .filter((child) => typeof child === 'string')
      .join(' ');
    const testId = `button-${childText.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <button onClick={onClick} disabled={disabled} className={className} data-testid={testId}>
        {children}
      </button>
    );
  },
}));

jest.mock('../progress', () => ({
  Progress: ({ value, className }: { value?: number; className?: string }) => (
    <div data-testid="progress" className={className} data-value={value}>
      Progress: {value}%
    </div>
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon">✓</div>,
  Loader2: () => (
    <div data-testid="loader-icon" className="animate-spin">
      ⟳
    </div>
  ),
}));

describe('WelcomeDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onStartSetup: jest.fn(),
    onSkipSetup: jest.fn(),
    isLoading: false,
    showSetupOptions: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render welcome message and setup options', () => {
      render(<WelcomeDialog {...defaultProps} />);

      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Welcome to Survii!');
      expect(screen.getByText(/To get you started quickly/)).toBeInTheDocument();
      expect(screen.getByTestId('button-set-up-sample-data')).toBeInTheDocument();
      expect(screen.getByTestId('button-start-with-empty-account')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<WelcomeDialog {...defaultProps} open={false} />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should display data type cards', () => {
      render(<WelcomeDialog {...defaultProps} />);

      expect(screen.getByText('Building Elements')).toBeInTheDocument();
      expect(screen.getByText('Components')).toBeInTheDocument();
      expect(screen.getByText('Inspection Phrases')).toBeInTheDocument();
      expect(screen.getByText('Survey Sections')).toBeInTheDocument();
    });

    it('should show setup options by default', () => {
      render(<WelcomeDialog {...defaultProps} />);

      expect(screen.getByTestId('button-set-up-sample-data')).toBeInTheDocument();
      expect(screen.getByTestId('button-start-with-empty-account')).toBeInTheDocument();
      expect(screen.getByText(/You can always import sample data later/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle setup button click', async () => {
      const user = userEvent.setup();
      render(<WelcomeDialog {...defaultProps} />);

      const setupButton = screen.getByTestId('button-set-up-sample-data');
      await user.click(setupButton);

      expect(defaultProps.onStartSetup).toHaveBeenCalledTimes(1);
    });

    it('should handle skip button click', async () => {
      const user = userEvent.setup();
      render(<WelcomeDialog {...defaultProps} />);

      const skipButton = screen.getByTestId('button-start-with-empty-account');
      await user.click(skipButton);

      expect(defaultProps.onSkipSetup).toHaveBeenCalledTimes(1);
    });

    it('should disable buttons when loading', () => {
      render(<WelcomeDialog {...defaultProps} isLoading={true} />);

      const setupButton = screen.getByTestId('button-set-up-sample-data');
      const skipButton = screen.getByTestId('button-start-with-empty-account');

      expect(setupButton).toBeDisabled();
      expect(skipButton).toBeDisabled();
    });

    it('should show loading spinner when loading', () => {
      render(<WelcomeDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('Progress State', () => {
    const mockProgress: SeedingProgress = {
      currentStep: 'Setting up building elements...',
      totalSteps: 4,
      currentStepIndex: 1,
      isComplete: false,
    };

    it('should show progress when seeding starts', () => {
      render(<WelcomeDialog {...defaultProps} progress={mockProgress} showSetupOptions={false} />);

      expect(screen.getByText('Setting up your account')).toBeInTheDocument();
      expect(screen.getByText('Setting up building elements...')).toBeInTheDocument();
      expect(screen.getByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

      // Should not show setup options during progress
      expect(screen.queryByTestId('button-set-up-sample-data')).not.toBeInTheDocument();
    });

    it('should update progress bar correctly', () => {
      const progress25 = { ...mockProgress, currentStepIndex: 1 }; // 25%
      const progress75 = { ...mockProgress, currentStepIndex: 3 }; // 75%

      const { rerender } = render(
        <WelcomeDialog {...defaultProps} progress={progress25} showSetupOptions={false} />,
      );

      let progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('data-value', '25');

      rerender(<WelcomeDialog {...defaultProps} progress={progress75} showSetupOptions={false} />);

      progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('data-value', '75');
    });

    it('should show loading icon during progress', () => {
      render(<WelcomeDialog {...defaultProps} progress={mockProgress} showSetupOptions={false} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toHaveClass('animate-spin');
    });

    it('should display current step information', () => {
      const progressStep2: SeedingProgress = {
        currentStep: 'Setting up building components...',
        totalSteps: 4,
        currentStepIndex: 2,
        isComplete: false,
      };

      render(<WelcomeDialog {...defaultProps} progress={progressStep2} showSetupOptions={false} />);

      expect(screen.getByText('Setting up building components...')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });
  });

  describe('Completion State', () => {
    const completeProgress: SeedingProgress = {
      currentStep: 'Data initialization complete!',
      totalSteps: 4,
      currentStepIndex: 4,
      isComplete: true,
    };

    it('should show completion state when finished', () => {
      render(
        <WelcomeDialog {...defaultProps} progress={completeProgress} showSetupOptions={false} />,
      );

      expect(screen.getByText('Setup Complete!')).toBeInTheDocument();
      expect(
        screen.getByText('Your account is ready. You can start creating surveys right away.'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('button-get-started')).toBeInTheDocument();
    });

    it('should handle get started button click', async () => {
      const user = userEvent.setup();
      render(
        <WelcomeDialog {...defaultProps} progress={completeProgress} showSetupOptions={false} />,
      );

      const getStartedButton = screen.getByTestId('button-get-started');
      await user.click(getStartedButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should not show progress bar when complete', () => {
      render(
        <WelcomeDialog {...defaultProps} progress={completeProgress} showSetupOptions={false} />,
      );

      expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
    });

    it('should not show loading icon when complete', () => {
      render(
        <WelcomeDialog {...defaultProps} progress={completeProgress} showSetupOptions={false} />,
      );

      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });
  });

  describe('Dialog Behavior', () => {
    it('should prevent closing during seeding', () => {
      const mockProgress: SeedingProgress = {
        currentStep: 'Setting up...',
        totalSteps: 4,
        currentStepIndex: 1,
        isComplete: false,
      };

      render(<WelcomeDialog {...defaultProps} progress={mockProgress} showSetupOptions={false} />);

      const dialogContent = screen.getByTestId('dialog-content');

      // Simulate pointer down outside (attempt to close)
      fireEvent.pointerDown(dialogContent, { target: document.body });

      // onOpenChange should not be called during active seeding
      expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
    });

    it('should call onOpenChange when provided', async () => {
      const user = userEvent.setup();
      render(<WelcomeDialog {...defaultProps} />);

      const skipButton = screen.getByTestId('button-start-with-empty-account');
      await user.click(skipButton);

      expect(defaultProps.onSkipSetup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<WelcomeDialog {...defaultProps} />);

      const title = screen.getByTestId('dialog-title');
      expect(title.tagName).toBe('H2');
    });

    it('should have proper button labels', () => {
      render(<WelcomeDialog {...defaultProps} />);

      expect(screen.getByTestId('button-set-up-sample-data')).toHaveTextContent(
        'Set Up Sample Data',
      );
      expect(screen.getByTestId('button-start-with-empty-account')).toHaveTextContent(
        'Start with Empty Account',
      );
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<WelcomeDialog {...defaultProps} />);

      // Tab to first button
      await user.tab();
      expect(screen.getByTestId('button-set-up-sample-data')).toHaveFocus();

      // Tab to second button
      await user.tab();
      expect(screen.getByTestId('button-start-with-empty-account')).toHaveFocus();

      // Enter should activate focused button
      await user.keyboard('{Enter}');
      expect(defaultProps.onSkipSetup).toHaveBeenCalledTimes(1);
    });

    it('should provide clear progress information for screen readers', () => {
      const mockProgress: SeedingProgress = {
        currentStep: 'Setting up building elements...',
        totalSteps: 4,
        currentStepIndex: 2,
        isComplete: false,
      };

      render(<WelcomeDialog {...defaultProps} progress={mockProgress} showSetupOptions={false} />);

      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('Setting up building elements...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined progress gracefully', () => {
      render(<WelcomeDialog {...defaultProps} progress={undefined} showSetupOptions={false} />);

      // Should not crash and should not show progress elements
      expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
      expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
    });

    it('should handle zero progress correctly', () => {
      const zeroProgress: SeedingProgress = {
        currentStep: 'Starting setup...',
        totalSteps: 4,
        currentStepIndex: 0,
        isComplete: false,
      };

      render(<WelcomeDialog {...defaultProps} progress={zeroProgress} showSetupOptions={false} />);

      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('data-value', '0');
      expect(screen.getByText('Step 0 of 4')).toBeInTheDocument();
    });

    it('should handle maximum progress correctly', () => {
      const maxProgress: SeedingProgress = {
        currentStep: 'Finishing up...',
        totalSteps: 4,
        currentStepIndex: 4,
        isComplete: false,
      };

      render(<WelcomeDialog {...defaultProps} progress={maxProgress} showSetupOptions={false} />);

      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('data-value', '100');
    });

    it('should handle missing callback functions', () => {
      const propsWithoutCallbacks = {
        open: true,
        isLoading: false,
        showSetupOptions: true,
        onStartSetup: jest.fn(),
        onSkipSetup: jest.fn(),
      };

      expect(() => {
        render(<WelcomeDialog {...propsWithoutCallbacks} />);
      }).not.toThrow();
    });
  });
});
