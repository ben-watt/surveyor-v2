import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '@/app/home/hooks/useAutoSave';

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with idle status', () => {
    const mockSaveFunction = jest.fn();

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.isSaving).toBe(false);
  });

  it('should trigger manual save correctly', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    const testData = { name: 'Test' };

    await act(async () => {
      await result.current.save(testData, { auto: false });
    });

    expect(mockSaveFunction).toHaveBeenCalledWith(testData, { auto: false });
    expect(result.current.saveStatus).toBe('saved');
  });

  it('should trigger autosave with delay', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoSave(mockSaveFunction, { delay: 1000 }));

    const testData = { name: 'Test' };

    act(() => {
      result.current.triggerAutoSave(testData);
    });

    // Should not save immediately
    expect(mockSaveFunction).not.toHaveBeenCalled();

    // Fast-forward time to trigger the timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Wait for the async save operation to complete
    await waitFor(() => {
      expect(mockSaveFunction).toHaveBeenCalledWith(testData, { auto: true });
    });

    // Wait for the status to update
    await waitFor(() => {
      expect(result.current.saveStatus).toBe('autosaved');
    });
  });

  it('should handle save errors correctly', async () => {
    const mockSaveFunction = jest.fn().mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    const testData = { name: 'Test' };

    await act(async () => {
      await result.current.save(testData, { auto: false });
    });

    expect(result.current.saveStatus).toBe('error');
  });

  it('should reset status after timeout', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    const testData = { name: 'Test' };

    await act(async () => {
      await result.current.save(testData, { auto: false });
    });

    expect(result.current.saveStatus).toBe('saved');

    // Fast-forward past the timeout (10 seconds for status reset)
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.saveStatus).toBe('idle');
  });

  it('should not save when disabled', async () => {
    const mockSaveFunction = jest.fn();

    const { result } = renderHook(() => useAutoSave(mockSaveFunction, { enabled: false }));

    const testData = { name: 'Test' };

    await act(async () => {
      await result.current.save(testData, { auto: false });
    });

    expect(mockSaveFunction).not.toHaveBeenCalled();
  });

  it('should not trigger autosave when disabled', () => {
    const mockSaveFunction = jest.fn();

    const { result } = renderHook(() => useAutoSave(mockSaveFunction, { enabled: false }));

    const testData = { name: 'Test' };

    act(() => {
      result.current.triggerAutoSave(testData);
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockSaveFunction).not.toHaveBeenCalled();
  });

  it('should not trigger autosave when already saving', async () => {
    const mockSaveFunction = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    const { result } = renderHook(() => useAutoSave(mockSaveFunction, { delay: 500 }));

    const testData = { name: 'Test' };

    // Start a manual save
    act(() => {
      result.current.save(testData, { auto: false });
    });

    // Try to trigger autosave while saving
    act(() => {
      result.current.triggerAutoSave(testData);
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should only have one call (the manual save)
    expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    expect(mockSaveFunction).toHaveBeenCalledWith(testData, { auto: false });
  });

  it('should show toast for manual save when enabled', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    const toast = require('react-hot-toast');

    const { result } = renderHook(() => useAutoSave(mockSaveFunction, { showToast: true }));

    const testData = { name: 'Test' };

    await act(async () => {
      await result.current.save(testData, { auto: false });
    });

    expect(toast.success).toHaveBeenCalledWith('Changes saved successfully');
  });

  it('should show toast for autosave when explicitly enabled', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);
    const toast = require('react-hot-toast');

    const { result } = renderHook(() =>
      useAutoSave(mockSaveFunction, { showToast: true, successMessage: 'Auto-saved!' }),
    );

    const testData = { name: 'Test' };

    act(() => {
      result.current.triggerAutoSave(testData);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockSaveFunction).toHaveBeenCalledWith(testData, { auto: true });
    });

    // The current implementation shows toast for autosave when showToast is true
    expect(toast.success).toHaveBeenCalledWith('Auto-saved!');
  });

  it('should provide resetStatus function', () => {
    const mockSaveFunction = jest.fn();

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    expect(typeof result.current.resetStatus).toBe('function');

    act(() => {
      result.current.resetStatus();
    });

    expect(result.current.saveStatus).toBe('idle');
  });

  it('should track last saved timestamp', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    const testData = { name: 'Test' };

    await act(async () => {
      await result.current.save(testData, { auto: false });
    });

    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('should set pending status when triggerAutoSave is called', () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoSave(mockSaveFunction, { delay: 1000 }));

    const testData = { name: 'Test' };

    act(() => {
      result.current.triggerAutoSave(testData);
    });

    expect(result.current.saveStatus).toBe('pending');
    expect(result.current.hasPendingChanges).toBe(true);
  });

  it('should clear pending status when save starts', async () => {
    const mockSaveFunction = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoSave(mockSaveFunction, { delay: 1000 }));

    const testData = { name: 'Test' };

    act(() => {
      result.current.triggerAutoSave(testData);
    });

    expect(result.current.saveStatus).toBe('pending');
    expect(result.current.hasPendingChanges).toBe(true);

    // Fast-forward time to trigger the timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Wait for the async save operation to start
    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saving');
      expect(result.current.hasPendingChanges).toBe(false);
    });
  });

  it('should expose hasPendingChanges property', () => {
    const mockSaveFunction = jest.fn();

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    expect(result.current.hasPendingChanges).toBe(false);
    expect(typeof result.current.hasPendingChanges).toBe('boolean');
  });

  it('should clear pending changes when resetStatus is called', () => {
    const mockSaveFunction = jest.fn();

    const { result } = renderHook(() => useAutoSave(mockSaveFunction));

    // Set pending status first
    act(() => {
      result.current.triggerAutoSave({ name: 'Test' });
    });

    expect(result.current.hasPendingChanges).toBe(true);
    expect(result.current.saveStatus).toBe('pending');

    act(() => {
      result.current.resetStatus();
    });

    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.saveStatus).toBe('idle');
  });
});
