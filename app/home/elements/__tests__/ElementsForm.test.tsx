import '@testing-library/jest-dom';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataForm } from '../form';

// Mocks
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('../../components/Drawer', () => ({
  useDynamicDrawer: () => ({ isOpen: false, openDrawer: jest.fn(), closeDrawer: jest.fn() }),
}));

const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock('../../clients/Database', () => ({
  elementStore: {
    add: (...args: any[]) => mockAdd(...args),
    update: (...args: any[]) => mockUpdate(...args),
    get: jest.fn(),
  },
  sectionStore: {
    useList: () => [true, [
      { id: 's1', name: 'Section 1', order: 0, createdAt: '', updatedAt: '', syncStatus: 'synced', tenantId: 't1' },
    ]],
  },
}));

describe('Element DataForm autosave on create', () => {
  jest.setTimeout(15000);
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds on first autosave then updates subsequently', async () => {
    render(<DataForm />);

    // Select Section via button trigger (mobile/desktop agnostic)
    // Desktop combobox trigger has role combobox
    const comboTrigger = screen.getByRole('combobox');
    await userEvent.click(comboTrigger);
    const option = await screen.findByText('Section 1');
    await userEvent.click(option);

    // Type name
    const inputs = screen.getAllByRole('textbox');
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], 'Element Name');

    // Wait for autosave: 300ms debounce + 2000ms delay
    await act(async () => {
      await new Promise(res => setTimeout(res, 2400));
    });

    await waitFor(() => expect(mockAdd).toHaveBeenCalled());

    // Change name to trigger update
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], 'Element Updated');

    await act(async () => {
      await new Promise(res => setTimeout(res, 2400));
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });
});


