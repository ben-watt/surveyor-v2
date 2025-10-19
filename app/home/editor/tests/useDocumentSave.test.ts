import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { Err, Ok } from 'ts-results';
import { useDocumentSave } from '../hooks/useDocumentSave';

const getMock = jest.fn();
const createMock = jest.fn();
const updateContentMock = jest.fn();
const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('@/app/home/clients/DocumentStore', () => ({
  documentStore: {
    get: (...args: unknown[]) => getMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    updateContent: (...args: unknown[]) => updateContentMock(...args),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('useDocumentSave missing tenant handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSaveHook = () =>
    renderHook(() =>
      useDocumentSave({
        id: 'doc-1',
        getMetadata: () => ({
          fileName: 'doc-1.tiptap',
          fileType: 'text/html',
          size: 10,
          lastModified: new Date().toISOString(),
        }),
      }),
    );

  it('surfaces tenant error toast during auto save', async () => {
    getMock.mockResolvedValue(Err(new Error('Not found')));
    createMock.mockResolvedValue(Err(new Error('No tenant ID found')));

    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.save('<p>content</p>', { auto: true });
    });

    expect(toastErrorMock).toHaveBeenCalledWith('Select a tenant to save documents');
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it('does not show toast for auto save generic errors', async () => {
    getMock.mockResolvedValue(Err(new Error('Not found')));
    createMock.mockResolvedValue(Err(new Error('Something went wrong')));

    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.save('<p>content</p>', { auto: true });
    });

    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('shows default error toast on manual save failure', async () => {
    getMock.mockResolvedValue(Ok({}));
    updateContentMock.mockResolvedValue(Err(new Error('Update failed')));

    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.save('<p>content</p>');
    });

    expect(toastErrorMock).toHaveBeenCalledWith('Failed to save document');
  });
});

