import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm, FormProvider, FieldErrors } from 'react-hook-form';
import { DynamicComboBox } from '../DynamicComboBox';
import { useMediaQuery } from 'usehooks-ts';

// Mock the useMediaQuery hook
jest.mock('usehooks-ts', () => ({
  useMediaQuery: jest.fn()
}));

// Mock the Drawer components
jest.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: any) => open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children }: any) => <div data-testid="drawer-content">{children}</div>,
  DrawerHeader: ({ children }: any) => <div data-testid="drawer-header">{children}</div>,
  DrawerTitle: ({ children }: any) => <div data-testid="drawer-title">{children}</div>,
  DrawerDescription: ({ children }: any) => <div data-testid="drawer-description">{children}</div>,
}));

const mockData = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3', children: [
    { value: '3-1', label: 'Sub Option 1' },
    { value: '3-2', label: 'Sub Option 2' }
  ]}
];

// Test wrapper component
function TestWrapper({ children, defaultValues = {} }: { children: React.ReactNode, defaultValues?: any }) {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('DynamicComboBox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop behavior', () => {
    beforeEach(() => {
      (useMediaQuery as jest.Mock).mockReturnValue(true); // Desktop mode
    });

    it('should render as a popover on desktop', () => {
      render(
        <TestWrapper>
          <DynamicComboBox
            name="test"
            data={mockData}
            labelTitle="Test Label"
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    });

    it('should show selected value on desktop', () => {
      render(
        <TestWrapper defaultValues={{ test: '2' }}>
          <DynamicComboBox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  describe('Mobile behavior', () => {
    beforeEach(() => {
      (useMediaQuery as jest.Mock).mockReturnValue(false); // Mobile mode
    });

    it('should render as a button that opens drawer on mobile', () => {
      render(
        <TestWrapper>
          <DynamicComboBox
            name="test"
            data={mockData}
            labelTitle="Test Label"
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Test Label')).toBeInTheDocument();
      
      // Should have a button, not a combobox
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Select...');
      
      // Drawer should not be open initially
      expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    });

    it('should open drawer when button is clicked on mobile', () => {
      render(
        <TestWrapper>
          <DynamicComboBox
            name="test"
            data={mockData}
            labelTitle="Test Label"
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Drawer should be open
      expect(screen.getByTestId('drawer')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-title')).toHaveTextContent('Test Label');
    });

    it('should display selected value count for multi-select on mobile', () => {
      render(
        <TestWrapper defaultValues={{ test: ['1', '2'] }}>
          <DynamicComboBox
            name="test"
            data={mockData}
            labelTitle="Test Label"
            control={undefined as any}
            errors={{}}
            isMulti={true}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('2 selected');
    });

    it('should display selected label for single select on mobile', () => {
      render(
        <TestWrapper defaultValues={{ test: '2' }}>
          <DynamicComboBox
            name="test"
            data={mockData}
            labelTitle="Test Label"
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Option 2');
    });
  });

  describe('Responsive behavior', () => {
    it('should switch between desktop and mobile modes when screen size changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <DynamicComboBox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );

      // Start with desktop
      (useMediaQuery as jest.Mock).mockReturnValue(true);
      rerender(
        <TestWrapper>
          <DynamicComboBox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();

      // Switch to mobile
      (useMediaQuery as jest.Mock).mockReturnValue(false);
      rerender(
        <TestWrapper>
          <DynamicComboBox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Form integration', () => {
    it('should display validation errors', () => {
      const errors: FieldErrors = {
        test: { 
          type: 'required',
          message: 'This field is required' 
        }
      };

      render(
        <TestWrapper>
          <DynamicComboBox
            name="test"
            data={mockData}
            control={undefined as any}
            errors={errors}
          />
        </TestWrapper>
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should handle object values correctly', () => {
      const objectData = [
        { value: { id: '1', name: 'Item 1' }, label: 'Item 1' },
        { value: { id: '2', name: 'Item 2' }, label: 'Item 2' }
      ];

      render(
        <TestWrapper defaultValues={{ test: { id: '1', name: 'Item 1' } }}>
          <DynamicComboBox
            name="test"
            data={objectData}
            control={undefined as any}
            errors={{}}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });
});