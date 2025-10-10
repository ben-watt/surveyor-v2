import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { RhfDropZoneInputImage } from '../RhfDropZoneInputImage';
import type { DropZoneInputFile } from '../index';

// Mock the child DropZone to capture props and simulate reorder
const mockDropZone = jest.fn((props: any) => {
  return (
    <button data-testid="trigger-reorder" onClick={() => props.onReorder?.([{ path: 'p1', isArchived: false, hasMetadata: false }])}>
      trigger reorder
    </button>
  );
});

jest.mock('../index', () => ({
  // Types are not needed here; only the component
  DropZoneInputImage: (props: any) => mockDropZone(props),
}));

const Wrapper: React.FC<{ defaultValue: DropZoneInputFile[] }> = ({ defaultValue }) => {
  const methods = useForm<{ images: DropZoneInputFile[] }>({ defaultValues: { images: defaultValue } });
  const { watch } = methods;
  const value = watch('images');
  return (
    <FormProvider {...methods}>
      <div data-testid="value">{JSON.stringify(value)}</div>
      <RhfDropZoneInputImage path="surveys/x/photos" rhfProps={{ name: 'images', control: methods.control }} />
    </FormProvider>
  );
};

describe('RhfDropZoneInputImage reordering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes RHF field value and updates it on onReorder', async () => {
    const initial = [
      { path: 'p0', isArchived: false, hasMetadata: false },
      { path: 'p2', isArchived: false, hasMetadata: false },
    ];

    render(<Wrapper defaultValue={initial} />);

    // Child receives initial value prop
    expect(mockDropZone).toHaveBeenCalled();
    const firstCallProps = mockDropZone.mock.calls[0][0];
    expect(firstCallProps.value).toEqual(initial);

    // Trigger reorder from child
    fireEvent.click(screen.getByTestId('trigger-reorder'));

    await waitFor(() => {
      // Wrapper shows updated JSON value
      expect(screen.getByTestId('value')).toHaveTextContent('[{"path":"p1","isArchived":false,"hasMetadata":false}]');
    });

    // Subsequent render passes updated value down
    const lastCallProps = mockDropZone.mock.calls[mockDropZone.mock.calls.length - 1][0];
    expect(lastCallProps.value).toEqual([{ path: 'p1', isArchived: false, hasMetadata: false }]);
  });
});
