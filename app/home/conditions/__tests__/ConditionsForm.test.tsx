import '@testing-library/jest-dom';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataForm } from '../form';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock('../../clients/Database', () => ({
  phraseStore: {
    add: (...args: any[]) => mockAdd(...args),
    update: (...args: any[]) => mockUpdate(...args),
    get: jest.fn(),
  },
  elementStore: {
    useList: () => [true, [
      { id: 'e1', name: 'Element 1', order: 0, sectionId: 's1', description: '', createdAt: '', updatedAt: '', syncStatus: 'synced', tenantId: 't1' },
    ]],
  },
  componentStore: {
    useList: () => [true, [
      { id: 'c1', name: 'Component 1', elementId: 'e1', materials: [], createdAt: '', updatedAt: '', syncStatus: 'synced', tenantId: 't1' },
    ]],
  }
}));

describe('Condition DataForm autosave on create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  jest.setTimeout(15000);

  it('adds on first autosave then updates subsequently', async () => {
    render(<DataForm />);

    // Type name (first textbox is name input)
    const textboxes = screen.getAllByRole('textbox');
    const nameInput = textboxes[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Condition Name');

    // Select associated elements
    // Desktop combobox trigger has role combobox
    const elementCombo = screen.getAllByRole('combobox')[0];
    await userEvent.click(elementCombo);
    const elOption = await screen.findByText('Element 1');
    await userEvent.click(elOption);

    // Enter required phrase to satisfy validation before autosave
    const phraseTextarea = screen.getByRole('textbox', { name: /phrase \(level 3\)/i });
    await userEvent.clear(phraseTextarea);
    await userEvent.type(phraseTextarea, 'Initial Phrase');

    // Wait for autosave (300ms + 2000ms)
    await act(async () => {
      await new Promise(res => setTimeout(res, 2400));
    });

    await waitFor(() => expect(mockAdd).toHaveBeenCalled());

    // Update phrase text to trigger update
    await userEvent.clear(phraseTextarea);
    await userEvent.type(phraseTextarea, 'Updated Phrase');

    await act(async () => {
      await new Promise(res => setTimeout(res, 2400));
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });
});


