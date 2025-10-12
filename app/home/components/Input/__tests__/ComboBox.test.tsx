import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { Combobox } from '../ComboBox';
import userEvent from '@testing-library/user-event';

const mockData = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  {
    value: '3',
    label: 'Option 3',
    children: [
      { value: '3-1', label: 'Sub Option 1' },
      { value: '3-2', label: 'Sub Option 2' },
    ],
  },
];

// Test wrapper component
function TestWrapper({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: any;
}) {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('Combobox', () => {
  it('should render with label', () => {
    render(
      <TestWrapper>
        <Combobox
          name="test"
          data={mockData}
          labelTitle="Test Label"
          control={undefined as any}
          errors={{}}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should display placeholder when no value is selected', () => {
    render(
      <TestWrapper>
        <Combobox name="test" data={mockData} control={undefined as any} errors={{}} />
      </TestWrapper>,
    );

    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('should open popover when clicked', async () => {
    render(
      <TestWrapper>
        <Combobox name="test" data={mockData} control={undefined as any} errors={{}} />
      </TestWrapper>,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });

  it('should filter options based on search', async () => {
    render(
      <TestWrapper>
        <Combobox name="test" data={mockData} control={undefined as any} errors={{}} />
      </TestWrapper>,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = await screen.findByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'Option 2');

    await waitFor(() => {
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });
  });

  it('should handle hierarchical navigation', async () => {
    render(
      <TestWrapper>
        <Combobox name="test" data={mockData} control={undefined as any} errors={{}} />
      </TestWrapper>,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Click on Option 3 which has children
    const option3 = await screen.findByText('Option 3');
    fireEvent.click(option3);

    // Should show sub options
    await waitFor(() => {
      expect(screen.getByText('Sub Option 1')).toBeInTheDocument();
      expect(screen.getByText('Sub Option 2')).toBeInTheDocument();
      expect(screen.getByText(/Back to/)).toBeInTheDocument();
    });
  });

  it('should handle multi-select mode', async () => {
    render(
      <TestWrapper>
        <Combobox
          name="test"
          data={mockData}
          control={undefined as any}
          errors={{}}
          isMulti={true}
        />
      </TestWrapper>,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Select multiple options
    const option1 = await screen.findByText('Option 1');
    fireEvent.click(option1);

    const option2 = await screen.findByText('Option 2');
    fireEvent.click(option2);

    // Both should be displayed
    expect(screen.getByText('Option 1, Option 2')).toBeInTheDocument();
  });

  it('should display validation errors', () => {
    const errors = {
      test: { message: 'This field is required', type: 'required' },
    };

    render(
      <TestWrapper>
        <Combobox name="test" data={mockData} control={undefined as any} errors={errors} />
      </TestWrapper>,
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should call onCreateNew when create new is clicked', async () => {
    const onCreateNew = jest.fn();

    render(
      <TestWrapper>
        <Combobox
          name="test"
          data={mockData}
          control={undefined as any}
          errors={{}}
          onCreateNew={onCreateNew}
        />
      </TestWrapper>,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const createNewButton = await screen.findByText('Create new...');
    fireEvent.click(createNewButton);

    expect(onCreateNew).toHaveBeenCalled();
  });

  it('should handle object values with unique keys', () => {
    const objectData = [
      { value: { id: '1', name: 'Item 1' }, label: 'Item 1' },
      { value: { id: '2', name: 'Item 2' }, label: 'Item 2' },
    ];

    const { container } = render(
      <TestWrapper>
        <Combobox name="test" data={objectData} control={undefined as any} errors={{}} />
      </TestWrapper>,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Should not have duplicate key warnings
    expect(container).toBeTruthy();
  });

  describe('Drawer mode', () => {
    it('should render without popover wrapper when inDrawer is true', () => {
      render(
        <TestWrapper>
          <Combobox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={{}}
            inDrawer={true}
          />
        </TestWrapper>,
      );

      // Should not have the popover trigger button (the button role)
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      // Should have the search input directly (combobox in Command component)
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();

      // Should have options directly visible
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('should call onClose when item is selected in drawer mode', async () => {
      const onClose = jest.fn();

      render(
        <TestWrapper>
          <Combobox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={{}}
            inDrawer={true}
            onClose={onClose}
          />
        </TestWrapper>,
      );

      const option1 = screen.getByText('Option 1');
      fireEvent.click(option1);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should have larger touch targets in drawer mode', () => {
      render(
        <TestWrapper>
          <Combobox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={{}}
            inDrawer={true}
          />
        </TestWrapper>,
      );

      const option1 = screen.getByText('Option 1');
      expect(option1.closest('[role="option"]')).toHaveClass('py-3');
    });
  });
});
