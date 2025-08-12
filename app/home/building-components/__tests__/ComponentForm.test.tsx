import '@testing-library/jest-dom';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataForm } from '../form';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));
jest.mock('../../components/Drawer', () => ({
  useDynamicDrawer: () => ({ isOpen: false, openDrawer: jest.fn(), closeDrawer: jest.fn() }),
}));

const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock('../../clients/Database', () => ({
  componentStore: {
    add: (...args: any[]) => mockAdd(...args),
    update: (...args: any[]) => mockUpdate(...args),
    get: jest.fn(),
  },
  elementStore: {
    useList: () => [true, [
      { id: 'e1', name: 'Element 1', order: 0, sectionId: 's1', description: '', createdAt: '', updatedAt: '', syncStatus: 'synced', tenantId: 't1' },
    ]],
  },
}));

describe('Component DataForm autosave on create', () => {
  jest.setTimeout(15000);
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds on first autosave then updates subsequently', async () => {
    render(<DataForm />);

    // Select Element
    // Desktop combobox trigger has role combobox
    const combo = screen.getByRole('combobox');
    await userEvent.click(combo);
    const option = await screen.findByText('Element 1');
    await userEvent.click(option);

    // Type name
    const nameInput = screen.getByRole('textbox');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Component Name');

    // Wait for autosave (300 + 2000)
    await act(async () => {
      await new Promise(res => setTimeout(res, 2400));
    });

    await waitFor(() => expect(mockAdd).toHaveBeenCalled());

    // Change to trigger update
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Component Updated');

    await act(async () => {
      await new Promise(res => setTimeout(res, 2400));
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });
});


