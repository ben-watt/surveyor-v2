import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import '@testing-library/jest-dom';

interface TestFormData {
  name: string;
  description: string;
  value: number;
}

interface TestFormProps {
  initialData?: TestFormData;
  updatedData?: TestFormData;
  useKeepDirtyValues?: boolean;
  onReset?: () => void;
}

function TestForm({ 
  initialData = { name: '', description: '', value: 0 },
  updatedData,
  useKeepDirtyValues = true,
  onReset
}: TestFormProps) {
  const methods = useForm<TestFormData>({
    defaultValues: initialData,
    mode: 'onChange'
  });

  const { register, reset, watch, formState: { dirtyFields } } = methods;
  const watchedValues = watch();

  useEffect(() => {
    if (updatedData) {
      // Simulate data loading from backend
      const timeoutId = setTimeout(() => {
        reset(updatedData, useKeepDirtyValues ? { keepDirtyValues: true } : undefined);
        onReset?.();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [updatedData, reset, useKeepDirtyValues, onReset]);

  return (
    <FormProvider {...methods}>
      <form>
        <input 
          {...register('name')} 
          placeholder="Name"
          data-testid="name-input"
        />
        <input 
          {...register('description')} 
          placeholder="Description"
          data-testid="description-input"
        />
        <input 
          {...register('value')} 
          type="number"
          placeholder="Value"
          data-testid="value-input"
        />
        <div data-testid="dirty-fields">
          {Object.keys(dirtyFields).join(',')}
        </div>
        <div data-testid="current-values">
          {JSON.stringify(watchedValues)}
        </div>
      </form>
    </FormProvider>
  );
}

describe('Form Reset with keepDirtyValues', () => {
  it('should preserve user input when reset is called with keepDirtyValues: true', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    
    const { rerender } = render(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        useKeepDirtyValues={true}
        onReset={onReset}
      />
    );

    // User modifies only the name field
    const nameInput = screen.getByTestId('name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'User Input');

    // Verify user input is present and field is dirty
    await waitFor(() => {
      expect(nameInput).toHaveValue('User Input');
      const dirtyFields = screen.getByTestId('dirty-fields');
      expect(dirtyFields.textContent).toContain('name');
    });

    // Simulate backend data update
    rerender(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        updatedData={{ name: 'Backend Update', description: 'New Desc', value: 200 }}
        useKeepDirtyValues={true}
        onReset={onReset}
      />
    );

    // Wait for reset to complete
    await waitFor(() => {
      expect(onReset).toHaveBeenCalled();
    }, { timeout: 500 });

    // User input should be preserved for dirty field (name)
    expect(nameInput).toHaveValue('User Input');
    
    // Non-dirty fields should be updated from backend
    expect(screen.getByTestId('description-input')).toHaveValue('New Desc');
    expect(screen.getByTestId('value-input')).toHaveValue(200);
  });

  it('should overwrite all fields when reset is called without keepDirtyValues', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        useKeepDirtyValues={false}
      />
    );

    // User modifies the name field
    const nameInput = screen.getByTestId('name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'User Input');

    // Verify user input is present
    await waitFor(() => {
      expect(nameInput).toHaveValue('User Input');
    });

    // Simulate backend data update
    rerender(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        updatedData={{ name: 'Backend Update', description: 'New Desc', value: 200 }}
        useKeepDirtyValues={false}
      />
    );

    // Wait for reset to occur
    await waitFor(() => {
      const values = screen.getByTestId('current-values');
      expect(values.textContent).toContain('Backend Update');
    }, { timeout: 500 });

    // All fields should be updated from backend, user input is lost
    expect(nameInput).toHaveValue('Backend Update');
    expect(screen.getByTestId('description-input')).toHaveValue('New Desc');
    expect(screen.getByTestId('value-input')).toHaveValue(200);
  });

  it('should track dirty fields correctly with keepDirtyValues', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    
    const { rerender } = render(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        useKeepDirtyValues={true}
        onReset={onReset}
      />
    );

    // Modify name and value fields
    const nameInput = screen.getByTestId('name-input');
    const valueInput = screen.getByTestId('value-input');
    
    await user.clear(nameInput);
    await user.type(nameInput, 'Modified');
    await user.clear(valueInput);
    await user.type(valueInput, '999');

    // Check dirty fields
    await waitFor(() => {
      const dirtyFields = screen.getByTestId('dirty-fields');
      expect(dirtyFields.textContent).toContain('name');
      expect(dirtyFields.textContent).toContain('value');
    });

    // Simulate backend update
    rerender(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        updatedData={{ name: 'Backend', description: 'Backend Desc', value: 500 }}
        useKeepDirtyValues={true}
        onReset={onReset}
      />
    );

    await waitFor(() => {
      expect(onReset).toHaveBeenCalled();
    });

    // Dirty fields should still be tracked for modified fields
    const dirtyFields = screen.getByTestId('dirty-fields');
    expect(dirtyFields.textContent).toContain('name');
    expect(dirtyFields.textContent).toContain('value');
    
    // Description should not be dirty as user didn't modify it
    expect(dirtyFields.textContent).not.toContain('description');
  });

  it('should handle multiple rapid resets with keepDirtyValues', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        useKeepDirtyValues={true}
      />
    );

    // User modifies fields
    const nameInput = screen.getByTestId('name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'User Input');

    // First backend update
    rerender(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        updatedData={{ name: 'Backend1', description: 'Desc1', value: 200 }}
        useKeepDirtyValues={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('description-input')).toHaveValue('Desc1');
    }, { timeout: 500 });

    // User input should still be preserved
    expect(nameInput).toHaveValue('User Input');

    // Second backend update
    rerender(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        updatedData={{ name: 'Backend2', description: 'Desc2', value: 300 }}
        useKeepDirtyValues={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('description-input')).toHaveValue('Desc2');
    }, { timeout: 500 });

    // User input should still be preserved through multiple resets
    expect(nameInput).toHaveValue('User Input');
    expect(screen.getByTestId('value-input')).toHaveValue(300);
  });

  it('should handle partial updates with keepDirtyValues', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        useKeepDirtyValues={true}
      />
    );

    // User modifies all fields
    const nameInput = screen.getByTestId('name-input');
    const descInput = screen.getByTestId('description-input');
    const valueInput = screen.getByTestId('value-input');
    
    await user.clear(nameInput);
    await user.type(nameInput, 'User Name');
    await user.clear(descInput);
    await user.type(descInput, 'User Desc');
    await user.clear(valueInput);
    await user.type(valueInput, '999');

    // Backend update with partial data
    rerender(
      <TestForm 
        initialData={{ name: 'Initial', description: 'Initial Desc', value: 100 }}
        updatedData={{ name: 'Backend', description: 'Initial Desc', value: 100 }}
        useKeepDirtyValues={true}
      />
    );

    await waitFor(() => {
      const values = screen.getByTestId('current-values');
      expect(values.textContent).toContain('User Name');
    }, { timeout: 500 });

    // All user inputs should be preserved
    expect(nameInput).toHaveValue('User Name');
    expect(descInput).toHaveValue('User Desc');
    expect(valueInput).toHaveValue(999);
  });
});

describe('Form behavior patterns matching production forms', () => {
  it('should match ElementForm reset pattern', async () => {
    const ElementFormMock = ({ survey }: { survey: any }) => {
      const methods = useForm<TestFormData>({
        defaultValues: { name: '', description: '', value: 0 },
        mode: 'onChange'
      });

      const { reset, register } = methods;

      useEffect(() => {
        if (survey) {
          reset({
            name: survey.name || '',
            description: survey.description || '',
            value: survey.value || 0
          }, { keepDirtyValues: true });
        }
      }, [survey, reset]);

      return (
        <FormProvider {...methods}>
          <form>
            <input {...register('name')} data-testid="name-input" />
            <input {...register('description')} data-testid="desc-input" />
          </form>
        </FormProvider>
      );
    };

    const user = userEvent.setup();
    const { rerender } = render(<ElementFormMock survey={null} />);

    // Simulate survey data loading
    rerender(<ElementFormMock survey={{ name: 'Survey1', description: 'Desc1', value: 10 }} />);

    await waitFor(() => {
      expect(screen.getByTestId('name-input')).toHaveValue('Survey1');
    });

    // User modifies a field
    const nameInput = screen.getByTestId('name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'Modified');

    // Simulate survey update from backend
    rerender(<ElementFormMock survey={{ name: 'Survey2', description: 'Desc2', value: 20 }} />);

    // User input should be preserved
    await waitFor(() => {
      expect(nameInput).toHaveValue('Modified');
      expect(screen.getByTestId('desc-input')).toHaveValue('Desc2');
    });
  });

  it('should handle hasInitialReset flag pattern correctly', async () => {
    const FormWithInitialReset = ({ data }: { data: any }) => {
      const [hasInitialReset, setHasInitialReset] = React.useState(false);
      const methods = useForm<TestFormData>({
        defaultValues: { name: '', description: '', value: 0 },
        mode: 'onChange'
      });

      const { reset, register } = methods;

      useEffect(() => {
        if (data && !hasInitialReset) {
          reset({
            name: data.name || '',
            description: data.description || '',
            value: data.value || 0
          }, { keepDirtyValues: true });
          setHasInitialReset(true);
        }
      }, [data, hasInitialReset, reset]);

      return (
        <FormProvider {...methods}>
          <form>
            <input {...register('name')} data-testid="name-input" />
            <div data-testid="has-reset">{hasInitialReset.toString()}</div>
          </form>
        </FormProvider>
      );
    };

    const { rerender } = render(<FormWithInitialReset data={null} />);
    
    expect(screen.getByTestId('has-reset')).toHaveTextContent('false');

    // First data load
    rerender(<FormWithInitialReset data={{ name: 'Initial', description: 'Desc', value: 1 }} />);

    await waitFor(() => {
      expect(screen.getByTestId('has-reset')).toHaveTextContent('true');
      expect(screen.getByTestId('name-input')).toHaveValue('Initial');
    });

    // Subsequent data updates should not trigger reset
    rerender(<FormWithInitialReset data={{ name: 'Updated', description: 'New Desc', value: 2 }} />);

    // Value should not change because hasInitialReset prevents further resets
    await waitFor(() => {
      expect(screen.getByTestId('name-input')).toHaveValue('Initial');
    });
  });
});