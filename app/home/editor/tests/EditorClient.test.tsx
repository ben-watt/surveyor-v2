import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

const useParamsMock = jest.fn();
const useSearchParamsMock = jest.fn();
const useCurrentTenantIdMock = jest.fn();
const useTemplateIdMock = jest.fn();
const useEditorStateMock = jest.fn();
const useDocumentSaveMock = jest.fn();
const useVersionHistoryMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => useParamsMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

jest.mock('@/app/home/utils/tenant-utils', () => ({
  useCurrentTenantId: () => useCurrentTenantIdMock(),
}));

jest.mock('@/app/home/editor/hooks/useTemplateId', () => ({
  useTemplateId: () => useTemplateIdMock(),
}));

jest.mock('@/app/home/editor/hooks/useEditorState', () => ({
  useEditorState: () => useEditorStateMock(),
}));

jest.mock('@/app/home/editor/hooks/useDocumentSave', () => ({
  useDocumentSave: () => useDocumentSaveMock(),
}));

jest.mock('@/app/home/editor/hooks/useVersionHistory', () => ({
  useVersionHistory: () => useVersionHistoryMock(),
}));

jest.mock('@/app/home/components/Input/BlockEditor', () => ({
  NewEditor: () => <div data-testid="new-editor" />,
}));

jest.mock('../components/PrintPreviewer', () => ({
  PrintPreviewer: () => <div data-testid="print-previewer" />,
}));

jest.mock('../components/VersionPreview', () => ({
  VersionPreview: () => <div data-testid="version-preview" />,
}));

jest.mock('../../components/VersionHistorySidebar', () => ({
  VersionHistorySidebar: () => <div data-testid="version-sidebar" />,
}));

// eslint-disable-next-line import/first
import EditorClient from '../[id]/EditorClient';

describe('EditorClient tenant gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useParamsMock.mockReturnValue({ id: 'doc-123' });
    useSearchParamsMock.mockReturnValue({
      get: jest.fn(() => null),
    });
    useTemplateIdMock.mockReturnValue('building-survey');
    useEditorStateMock.mockReturnValue({
      isLoading: false,
      editorContent: '<p>content</p>',
      previewContent: '<p>preview</p>',
      header: '<div id="pageMarginTopCenter" data-running-role="top-center" style="position: running(pageMarginTopCenter);"></div>',
      footer: '<div id="pageMarginBottomCenter" data-running-role="bottom-center" style="position: running(pageMarginBottomCenter);"></div>',
      titlePage: '',
      addTitleHeaderFooter: jest.fn(),
      getDocName: jest.fn(),
      setPreviewContent: jest.fn(),
      setHeader: jest.fn(),
      setFooter: jest.fn(),
    });
    useDocumentSaveMock.mockReturnValue({
      save: jest.fn(),
      isSaving: false,
      saveStatus: 'idle',
    });
    useVersionHistoryMock.mockReturnValue({
      versions: [],
      isLoading: false,
      fetchVersions: jest.fn(),
    });
  });

  it('blocks editing when tenant is not selected', () => {
    useCurrentTenantIdMock.mockReturnValue([true, null]);

    render(<EditorClient />);

    expect(
      screen.getByText('Select a tenant to edit documents', { exact: false }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('new-editor')).not.toBeInTheDocument();
  });

  it('renders editor when tenant is present', () => {
    useCurrentTenantIdMock.mockReturnValue([true, 'tenant-1']);

    render(<EditorClient />);

    expect(screen.getByTestId('new-editor')).toBeInTheDocument();
  });
});
