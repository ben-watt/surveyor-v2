import '@testing-library/jest-dom';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { useAutoSaveForm } from '../useAutoSaveForm';

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

interface TestFormData {
  name: string;
  email: string;
}

describe('useAutoSaveForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with form integration', () => {
    const mockSaveFunction = jest.fn();
    
    const TestForm = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { saveStatus, isSaving } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues,
        form.trigger,
        { watchChanges: true }
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <div data-testid="saving">{isSaving ? 'saving' : 'not-saving'}</div>
        </FormProvider>
      );
    };

    render(<TestForm />);

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('saving')).toHaveTextContent('not-saving');
  });

  it('should provide enhanced save function', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    
    const TestFormWithSave = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { save, saveStatus } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <button data-testid="manual-save" onClick={() => save({ name: 'Test', email: 'test@example.com' })}>
            Save
          </button>
        </FormProvider>
      );
    };

    render(<TestFormWithSave />);

    // Test manual save
    await act(async () => {
      screen.getByTestId('manual-save').click();
    });

    expect(mockSaveFunction).toHaveBeenCalledWith(
      { name: 'Test', email: 'test@example.com' },
      { auto: false }
    );

    // Wait for status update
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('saved');
    });
  });

  it('should handle save errors correctly', async () => {
    const mockSaveFunction = jest.fn().mockRejectedValue(new Error('Save failed'));
    
    const TestFormWithError = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { save, saveStatus } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <button data-testid="manual-save" onClick={() => save({ name: 'Test', email: 'test@example.com' })}>
            Save
          </button>
        </FormProvider>
      );
    };

    render(<TestFormWithError />);

    // Test manual save
    await act(async () => {
      screen.getByTestId('manual-save').click();
    });

    // The error should be handled by the hook
    expect(mockSaveFunction).toHaveBeenCalled();
    
    // Wait for error status
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });
  });

  it('should provide triggerAutoSave function', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    
    const TestFormWithTrigger = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { triggerAutoSave, saveStatus } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues,
        form.trigger,
        { delay: 1000 }
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <button data-testid="trigger-autosave" onClick={() => triggerAutoSave({ name: 'New', email: 'new@test.com' })}>
            Trigger Autosave
          </button>
        </FormProvider>
      );
    };

    render(<TestFormWithTrigger />);

    // Trigger autosave
    act(() => {
      screen.getByTestId('trigger-autosave').click();
    });

    // Should not save immediately due to delay
    expect(mockSaveFunction).not.toHaveBeenCalled();

    // Fast-forward time
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Should save after delay
    await waitFor(() => {
      expect(mockSaveFunction).toHaveBeenCalledWith(
        { name: 'New', email: 'new@test.com' },
        { auto: true }
      );
    });

    expect(screen.getByTestId('status')).toHaveTextContent('autosaved');
  });

  it('should not trigger autosave when disabled', async () => {
    const mockSaveFunction = jest.fn();
    
    const TestFormDisabled = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { triggerAutoSave } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues,
        form.trigger,
        { enabled: false, delay: 1000 }
      );

      return (
        <FormProvider {...(form as any)}>
          <button data-testid="trigger-autosave" onClick={() => triggerAutoSave({ name: 'New', email: 'new@test.com' })}>
            Trigger Autosave
          </button>
        </FormProvider>
      );
    };

    render(<TestFormDisabled />);

    // Trigger autosave
    act(() => {
      screen.getByTestId('trigger-autosave').click();
    });

    // Fast-forward time
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockSaveFunction).not.toHaveBeenCalled();
  });

  it('should provide resetStatus function', () => {
    const mockSaveFunction = jest.fn();
    
    const TestFormWithReset = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { resetStatus, saveStatus } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <button data-testid="reset-status" onClick={() => resetStatus()}>
            Reset Status
          </button>
        </FormProvider>
      );
    };

    render(<TestFormWithReset />);

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    
    act(() => {
      screen.getByTestId('reset-status').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('should track last saved timestamp', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    
    const TestFormWithTimestamp = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { save, lastSavedAt } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="last-saved">{lastSavedAt ? lastSavedAt.toISOString() : 'never'}</div>
          <button data-testid="manual-save" onClick={() => save({ name: 'Test', email: 'test@example.com' })}>
            Save
          </button>
        </FormProvider>
      );
    };

    render(<TestFormWithTimestamp />);

    expect(screen.getByTestId('last-saved')).toHaveTextContent('never');

    await act(async () => {
      screen.getByTestId('manual-save').click();
    });

    // Wait for timestamp update
    await waitFor(() => {
      expect(screen.getByTestId('last-saved')).not.toHaveTextContent('never');
    });

    await waitFor(() => {
      expect(screen.getByTestId('last-saved')).not.toHaveTextContent('never');
    });
  });

  it('should use updated default watchDelay of 300ms', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    
    const TestFormWithDefaultTiming = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { triggerAutoSave, saveStatus } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues,
        form.trigger,
        { delay: 1000 } // Default watchDelay should be 300ms
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <button data-testid="trigger-autosave" onClick={() => triggerAutoSave({ name: 'New', email: 'new@test.com' })}>
            Trigger Autosave
          </button>
        </FormProvider>
      );
    };

    render(<TestFormWithDefaultTiming />);

    // Trigger autosave
    act(() => {
      screen.getByTestId('trigger-autosave').click();
    });

    // Should show pending status immediately
    expect(screen.getByTestId('status')).toHaveTextContent('pending');

    // Fast-forward time by delay amount
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Should save after delay
    await waitFor(() => {
      expect(mockSaveFunction).toHaveBeenCalledWith(
        { name: 'New', email: 'new@test.com' },
        { auto: true }
      );
    });

    expect(screen.getByTestId('status')).toHaveTextContent('autosaved');
  });

  it('should expose hasPendingChanges property', () => {
    const mockSaveFunction = jest.fn();
    
    const TestFormWithPendingChanges = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { triggerAutoSave, hasPendingChanges, saveStatus } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues,
        form.trigger,
        { delay: 1000 }
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <div data-testid="pending">{hasPendingChanges ? 'true' : 'false'}</div>
          <button data-testid="trigger-autosave" onClick={() => triggerAutoSave({ name: 'New', email: 'new@test.com' })}>
            Trigger Autosave
          </button>
        </FormProvider>
      );
    };

    render(<TestFormWithPendingChanges />);

    expect(screen.getByTestId('pending')).toHaveTextContent('false');

    // Trigger autosave
    act(() => {
      screen.getByTestId('trigger-autosave').click();
    });

    expect(screen.getByTestId('pending')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('pending');
  });

  it('should clear pending status when save completes', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    
    const TestFormPendingClear = () => {
      const form: ReturnType<typeof useForm<TestFormData>> = useForm<TestFormData>({ defaultValues: { name: 'Test', email: 'test@example.com' } });
      const { getValues } = form;

      const { triggerAutoSave, hasPendingChanges, saveStatus } = useAutoSaveForm(
        mockSaveFunction,
        form.watch,
        getValues,
        form.trigger,
        { delay: 1000 }
      );

      return (
        <FormProvider {...(form as any)}>
          <div data-testid="status">{saveStatus}</div>
          <div data-testid="pending">{hasPendingChanges ? 'true' : 'false'}</div>
          <button data-testid="trigger-autosave" onClick={() => triggerAutoSave({ name: 'New', email: 'new@test.com' })}>
            Trigger Autosave
          </button>
        </FormProvider>
      );
    };

    render(<TestFormPendingClear />);

    // Trigger autosave
    act(() => {
      screen.getByTestId('trigger-autosave').click();
    });

    expect(screen.getByTestId('pending')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('pending');

    // Fast-forward time to trigger save
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Wait for save to complete
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('autosaved');
    });

    expect(screen.getByTestId('pending')).toHaveTextContent('false');
  });
}); 