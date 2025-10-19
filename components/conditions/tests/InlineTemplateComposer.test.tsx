import '@testing-library/jest-dom';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineTemplateComposer, {
  type InlineTemplateComposerAction,
} from '../InlineTemplateComposer';

const mockInsertSampleSelect = jest.fn();
const mockInsertText = jest.fn();

jest.mock('../TokenEditor', () => {
  const React = require('react');
  return {
    __esModule: true,
    // eslint-disable-next-line react/display-name
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        insertText: mockInsertText,
        insertSampleSelect: mockInsertSampleSelect,
      }));
      return (
        <textarea
          data-testid="token-editor"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          readOnly={props.readOnly}
        />
      );
    }),
  };
});

jest.mock('@/lib/conditions/interop', () => ({
  tokensToDoc: jest.fn((value: string) => ({ type: 'doc', content: value })),
  docToTokens: jest.fn((doc: any) => doc.content ?? ''),
}));

let latestEditorOptions: any = null;
const mockGetJSON = jest.fn(() => ({ type: 'doc', content: 'doc' }));
const mockInsertInlineSelect = jest.fn();
const mockSetEditable = jest.fn();
const mockFocusCommand = jest.fn();

const createChain = () => {
  const chain: any = {
    setContent: jest.fn(() => chain),
    focus: jest.fn(() => chain),
    run: jest.fn(),
  };
  return chain;
};

const mockEditor = {
  getJSON: mockGetJSON,
  chain: () => createChain(),
  commands: {
    insertInlineSelect: mockInsertInlineSelect,
    focus: mockFocusCommand,
  },
  setEditable: mockSetEditable,
};

jest.mock('@tiptap/react', () => {
  const React = require('react');
  return {
    useEditor: (options: any) => {
      latestEditorOptions = options;
      return mockEditor;
    },
    EditorContent: ({ 'aria-label': ariaLabel, ...props }: any) =>
      React.createElement('div', { role: 'textbox', 'aria-label': ariaLabel, ...props }),
    NodeViewWrapper: ({ children }: any) => React.createElement('span', null, children),
    ReactNodeViewRenderer: (component: any) => component,
  };
});

describe('InlineTemplateComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestEditorOptions = null;
  });

  it('invokes token mode actions with the imperative handle', async () => {
    const user = userEvent.setup();
    render(
      <InlineTemplateComposer
        value="Sample tokens"
        onChange={jest.fn()}
        tokenModeActions={[
          {
            label: 'Add sample token',
            icon: <span>+</span>,
            onSelect: (api) => api.insertSampleToken(),
          },
        ]}
      />,
    );

    const actionButton = screen.getByRole('button', { name: 'Add sample token' });
    await user.click(actionButton);

    expect(mockInsertSampleSelect).toHaveBeenCalledTimes(1);
  });

  it('emits onDocChange when visual editor content updates', async () => {
    const user = userEvent.setup();
    const onDocChange = jest.fn();
    const onChange = jest.fn();
    const doc = { type: 'doc', content: 'visual-doc' };
    mockGetJSON.mockReturnValue(doc);

    render(
      <InlineTemplateComposer value="Initial" onChange={onChange} onDocChange={onDocChange} />,
    );

    const toggle = screen.getByRole('button', { name: /switch to visual view/i });
    await user.click(toggle);
    expect(mockSetEditable).toHaveBeenCalledWith(true);

    await act(async () => {
      latestEditorOptions.onUpdate({ editor: mockEditor });
    });

    expect(onDocChange).toHaveBeenCalledWith(doc);
    expect(onChange).toHaveBeenCalledWith(doc.content);
  });

  it('hides actions and prevents edits when readOnly', () => {
    render(
      <InlineTemplateComposer
        value="Read only text"
        onChange={jest.fn()}
        readOnly
        tokenModeActions={[
          {
            label: 'Hidden action',
            icon: <span>+</span>,
            onSelect: (api) => api.insertSampleToken(),
          },
        ]}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Hidden action' })).toBeNull();
    const tokenTextarea = screen.getByTestId('token-editor') as HTMLTextAreaElement;
    expect(tokenTextarea).toHaveAttribute('readOnly');
    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });
});
