import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataForm } from '../form';

jest.mock('@uiw/react-codemirror', () => {
  return React.forwardRef<HTMLTextAreaElement, any>(function MockCodeMirror(
    { value, onChange, ...props },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        {...props}
      />
    );
  });
});

jest.mock('@tiptap/react', () => {
  const React = require('react');
  return {
    useEditor: ({ content }: any) => {
      const editor = {
        getJSON: () => content ?? { type: 'doc', content: [] },
        chain: () => ({
          setContent: () => ({
            focus: () => ({
              run: () => undefined,
            }),
          }),
        }),
        commands: {
          insertInlineSelect: jest.fn(),
          focus: jest.fn(),
        },
        setEditable: jest.fn(),
      };
      return editor;
    },
    EditorContent: ({ 'aria-label': ariaLabel, ...props }: any) =>
      React.createElement('div', { role: 'textbox', 'aria-label': ariaLabel, ...props }),
    NodeViewWrapper: ({ children }: any) => React.createElement('span', null, children),
    ReactNodeViewRenderer: (component: any) => component,
  };
});

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
    useGet: (id: string) => [
      true,
      createdRef.value
        ? {
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
            tenantId: 't1',
          }
        : undefined,
    ],
  },
  componentStore: {
    useList: () => [
      true,
      [
        {
          id: 'c1',
          name: 'Component 1',
          elementId: 'e1',
          materials: [],
          order: 0,
          createdAt: '',
          updatedAt: '',
          syncStatus: 'synced',
          tenantId: 't1',
        },
      ],
    ],
  },
}));

describe('Condition DataForm autosave on create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createdRef.value = false;
  });
  jest.setTimeout(15000);

  it('adds on first autosave then updates subsequently', async () => {
    render(<DataForm />);

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Condition Name');

    // Select associated components
    // Desktop combobox trigger has role combobox
    const componentCombo = screen.getAllByRole('combobox')[0];
    await userEvent.click(componentCombo);
    const compOption = await screen.findByText('Component 1');
    await userEvent.click(compOption);

    const sampleButton = screen.getAllByRole('button', { name: /insert sample select/i })[0];
    await userEvent.click(sampleButton);

    // Enter required phrase to satisfy validation before autosave
    const phraseEditor = screen.getAllByRole('textbox', { name: /phrase \(level 3\)/i })[0];
    await userEvent.clear(phraseEditor);
    await userEvent.type(phraseEditor, 'Initial Phrase');

    // Wait for autosave
    await waitFor(() => expect(mockAdd).toHaveBeenCalled());

    // Wait 2 seconds for debounce
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await userEvent.clear(phraseEditor);
    await userEvent.type(phraseEditor, 'Updated Phrase');

    // Wait for autosave
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });
});
