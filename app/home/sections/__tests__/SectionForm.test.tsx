import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionForm from '../form';

// Mock toast to avoid side effects
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock next/navigation router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

// Mock Database store
const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock('../../clients/Database', () => ({
  sectionStore: {
    add: (...args: any[]) => mockAdd(...args),
    update: (...args: any[]) => mockUpdate(...args),
  },
}));

declare global {
  namespace NodeJS {
    interface Global {
      crypto: { randomUUID: () => string };
    }
  }
}

describe('SectionForm autosave on create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers add via autosave when creating a new section (no initialData)', async () => {
    render(<SectionForm />);

    const nameInput = screen.getByPlaceholderText('Enter section name');
    await userEvent.type(nameInput, 'New Section');

    // Wait for autosave flow: watchDelay (300ms) + autosave delay (1000ms)
    await act(async () => {
      await new Promise(res => setTimeout(res, 1600));
    });

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledTimes(1);
    });

    // Assert an add occurred (payload may be partial while typing due to immediate autosave)
    expect(mockAdd).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('uses update on subsequent autosaves after the first creation', async () => {
    render(<SectionForm />);

    const nameInput = screen.getByPlaceholderText('Enter section name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'First');

    // First autosave -> add (300 + 1000)
    await act(async () => {
      await new Promise(res => setTimeout(res, 1600));
    });

    // Next change
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Second');

    // Second autosave -> update (300 + 1000)
    await act(async () => {
      await new Promise(res => setTimeout(res, 1600));
    });

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});


