import '@testing-library/jest-dom';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataForm } from '../form';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const createdRef = { value: false } as { value: boolean };
const mockAdd = jest.fn().mockImplementation(async (...args: any[]) => {
  createdRef.value = true;
  return undefined;
});
const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock('../../clients/Database', () => ({
  phraseStore: {
    add: (...args: any[]) => mockAdd(...args),
    update: (...args: any[]) => mockUpdate(...args),
    get: jest.fn(),
    useGet: (id: string) => [true, createdRef.value ? {
      id,
      name: 'Existing',
      type: 'condition',
      phrase: '',
      phraseLevel2: '',
      associatedComponentIds: [],
      order: 0,
      createdAt: '',
      updatedAt: '',
      syncStatus: 'synced',
      tenantId: 't1'
    } : undefined],
  },
  componentStore: {
    useList: () => [true, [
      { id: 'c1', name: 'Component 1', elementId: 'e1', materials: [], order: 0, createdAt: '', updatedAt: '', syncStatus: 'synced', tenantId: 't1' },
    ]],
  }
}));

describe('Condition DataForm autosave on create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createdRef.value = false;
  });
  jest.setTimeout(15000);

  it('adds on first autosave then updates subsequently', async () => {
    render(<DataForm />);

    // Type name (first textbox is name input)
    const textboxes = screen.getAllByRole('textbox');
    const nameInput = textboxes[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Condition Name');

    // Select associated components
    // Desktop combobox trigger has role combobox
    const componentCombo = screen.getAllByRole('combobox')[0];
    await userEvent.click(componentCombo);
    const compOption = await screen.findByText('Component 1');
    await userEvent.click(compOption);

    // Enter required phrase to satisfy validation before autosave
    const phraseTextarea = screen.getByRole('textbox', { name: /phrase \(level 3\)/i });
    await userEvent.clear(phraseTextarea);
    await userEvent.type(phraseTextarea, 'Initial Phrase');

    // Wait for autosave
    await waitFor(() => expect(mockAdd).toHaveBeenCalled());

    // Wait 2 seconds for debounce
    await new Promise(resolve => setTimeout(resolve, 2000));
    await userEvent.clear(phraseTextarea);
    await userEvent.type(phraseTextarea, 'Updated Phrase');

    // Wait for autosave
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });
});


