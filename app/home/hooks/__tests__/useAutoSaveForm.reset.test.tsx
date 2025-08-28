import React, { useEffect, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useAutoSaveForm } from '../useAutoSaveForm';

describe('useAutoSaveForm - Reset with keepDirtyValues', () => {
  it('should NOT trigger autosave when form is reset with data after initialization', async () => {
    const saveFunction = jest.fn();
    let skipNextChangeFn: any;

    const TestComponent = () => {
      const form = useForm({
        defaultValues: {
          id: '123',
          name: '',
          description: ''
        },
        mode: 'onChange'
      });

      const { watch, getValues, trigger, reset } = form;
      const [dataLoaded, setDataLoaded] = useState(false);

      const { skipNextChange } = useAutoSaveForm(
        saveFunction,
        watch,
        getValues,
        trigger,
        {
          delay: 100,
          watchDelay: 50,
          enabled: true,
          validateBeforeSave: false
        }
      );

      skipNextChangeFn = skipNextChange;

      // Simulate data loading from database after component mount
      useEffect(() => {
        const timer = setTimeout(() => {
          console.log('Simulating data load from database');
          // Call skipNextChange before reset
          skipNextChange();
          
          // Reset form with loaded data (simulating database load)
          reset({
            id: '123',
            name: 'Loaded Name',
            description: 'Loaded Description'
          }, { keepDirtyValues: true });
          
          setDataLoaded(true);
        }, 200);

        return () => clearTimeout(timer);
      }, [reset, skipNextChange]);

      return (
        <div>
          <div data-testid="loaded">{dataLoaded ? 'loaded' : 'loading'}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Wait for data to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded');
    }, { timeout: 500 });

    // Wait a bit more to ensure no autosave is triggered
    await new Promise(resolve => setTimeout(resolve, 300));

    // The save function should NOT have been called
    expect(saveFunction).not.toHaveBeenCalled();
  });

  it('should trigger autosave when user makes changes after reset', async () => {
    const saveFunction = jest.fn();
    let formInstance: any;

    const TestComponent = () => {
      const form = useForm({
        defaultValues: {
          id: '123',
          name: '',
          description: ''
        },
        mode: 'onChange'
      });

      const { watch, getValues, trigger, reset, setValue } = form;
      formInstance = form;
      const [dataLoaded, setDataLoaded] = useState(false);

      const { skipNextChange } = useAutoSaveForm(
        saveFunction,
        watch,
        getValues,
        trigger,
        {
          delay: 100,
          watchDelay: 50,
          enabled: true,
          validateBeforeSave: false
        }
      );

      // Simulate data loading from database after component mount
      useEffect(() => {
        const timer = setTimeout(() => {
          console.log('Simulating data load from database');
          // Call skipNextChange before reset
          skipNextChange();
          
          // Reset form with loaded data
          reset({
            id: '123',
            name: 'Loaded Name',
            description: 'Loaded Description'
          }, { keepDirtyValues: true });
          
          setDataLoaded(true);
        }, 200);

        return () => clearTimeout(timer);
      }, [reset, skipNextChange]);

      return (
        <div>
          <div data-testid="loaded">{dataLoaded ? 'loaded' : 'loading'}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Wait for data to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded');
    });

    // Clear any calls from initialization
    saveFunction.mockClear();

    // Wait for the skip period to pass (500ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Now simulate a user change
    act(() => {
      formInstance.setValue('name', 'User Changed Name');
    });

    // Wait for autosave to trigger
    await waitFor(() => {
      expect(saveFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'User Changed Name'
        }),
        expect.objectContaining({ auto: true })
      );
    }, { timeout: 500 });
  });

  it('reproduces the actual form pattern - initialize, then load data', async () => {
    const saveFunction = jest.fn();
    
    // This mimics what the actual forms do
    const TestComponent = () => {
      const form = useForm({
        defaultValues: {
          id: '123',
          name: '',
          sectionId: '',
          description: ''
        },
        mode: 'onChange'
      });

      const { watch, getValues, trigger, reset } = form;
      const [hasInitialReset, setHasInitialReset] = useState(false);
      const [dataFromDb, setDataFromDb] = useState<any>(null);

      const { skipNextChange } = useAutoSaveForm(
        saveFunction,
        watch,
        getValues,
        trigger,
        {
          delay: 100,
          watchDelay: 50,
          enabled: true,
          validateBeforeSave: false
        }
      );

      // Simulate database hook that loads data
      useEffect(() => {
        const timer = setTimeout(() => {
          setDataFromDb({
            id: '123',
            name: 'Element Name',
            sectionId: 'section-1',
            description: 'Element Description'
          });
        }, 150);
        return () => clearTimeout(timer);
      }, []);

      // Effect that resets form when data loads (like in actual forms)
      useEffect(() => {
        if (dataFromDb && !hasInitialReset) {
          console.log('Data loaded, resetting form');
          skipNextChange();
          reset({
            id: dataFromDb.id,
            name: dataFromDb.name ?? '',
            sectionId: dataFromDb.sectionId ?? '',
            description: dataFromDb.description ?? ''
          }, { keepDirtyValues: true });
          setHasInitialReset(true);
        }
      }, [dataFromDb, hasInitialReset, reset, skipNextChange]);

      return (
        <div>
          <div data-testid="status">
            {dataFromDb ? 'loaded' : 'loading'}
          </div>
        </div>
      );
    };

    render(<TestComponent />);

    // Wait for data to load and reset to happen
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('loaded');
    }, { timeout: 500 });

    // Wait a bit more for any potential autosave
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should NOT have triggered autosave
    expect(saveFunction).not.toHaveBeenCalled();
  });

  it('should handle multiple rapid resets without triggering autosave', async () => {
    const saveFunction = jest.fn();
    let formInstance: any;

    const TestComponent = () => {
      const form = useForm({
        defaultValues: {
          id: '123',
          name: '',
          description: ''
        },
        mode: 'onChange'
      });

      const { watch, getValues, trigger, reset } = form;
      formInstance = form;

      const { skipNextChange } = useAutoSaveForm(
        saveFunction,
        watch,
        getValues,
        trigger,
        {
          delay: 100,
          watchDelay: 50,
          enabled: true,
          validateBeforeSave: false
        }
      );

      // Expose functions for testing
      useEffect(() => {
        (window as any).testReset = (data: any) => {
          skipNextChange();
          reset(data, { keepDirtyValues: true });
        };
      }, [reset, skipNextChange]);

      return <div data-testid="test">Test</div>;
    };

    render(<TestComponent />);

    // Perform multiple rapid resets
    act(() => {
      (window as any).testReset({ id: '123', name: 'First', description: 'First' });
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      (window as any).testReset({ id: '123', name: 'Second', description: 'Second' });
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      (window as any).testReset({ id: '123', name: 'Third', description: 'Third' });
    });

    // Wait for any potential autosave
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should NOT have triggered autosave for any reset
    expect(saveFunction).not.toHaveBeenCalled();
  });
});