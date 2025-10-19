import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Ok, Err } from 'ts-results';
import { SurveyDocuments } from '@/app/home/components/SurveyDocuments';
import { documentStore } from '@/app/home/clients/DocumentStore';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/app/home/clients/DocumentStore', () => ({
  documentStore: {
    list: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuItem: ({
      children,
      onSelect,
      disabled,
    }: {
      children: React.ReactNode;
      onSelect?: (event: { preventDefault: () => void }) => void;
      disabled?: boolean;
    }) => (
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          onSelect?.({ preventDefault: () => {} });
        }}
        disabled={disabled}
      >
        {children}
      </button>
    ),
  };
});

describe('SurveyDocuments', () => {
  let routerPush: jest.Mock;
  const mockDocuments = [
    {
      id: 'doc1',
      displayName: 'Test Document 1',
      currentVersion: 2,
      updatedAt: '2024-03-20T10:00:00Z',
      fileName: 'doc1.html',
      metadata: {
        tags: ['survey-123'],
      },
    },
    {
      id: 'doc1',
      displayName: 'Test Document 2',
      currentVersion: 1,
      updatedAt: '2024-03-19T10:00:00Z',
      metadata: {
        tags: ['survey-123'],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    routerPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: routerPush,
    });
  });

  it('renders loading state initially', () => {
    (documentStore.list as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<SurveyDocuments surveyId="doc1" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error message when document fetch fails', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Err(new Error('Failed to load')));

    render(<SurveyDocuments surveyId="unknown" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load documents')).toBeInTheDocument();
    });
  });

  it('renders a Generate report button when no documents are found and navigates on click', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok([]));

    render(<SurveyDocuments surveyId="no-documents" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    expect(routerPush).toHaveBeenCalledWith('/home/editor/no-documents?templateId=building-survey');
  });

  it('renders documents sorted by version', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok(mockDocuments));

    render(<SurveyDocuments surveyId="doc1" />);

    await waitFor(() => expect(screen.getByText('Test Document 1')).toBeInTheDocument());
    expect(screen.getByText('Test Document 2')).toBeInTheDocument();

    expect(screen.getByText(/Version 2/)).toBeInTheDocument();
    expect(screen.getByText(/Version 1/)).toBeInTheDocument();
    expect(screen.getByText(/20\/03\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/19\/03\/2024/)).toBeInTheDocument();
  });

  it('navigates to editor when document card is clicked', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok(mockDocuments));

    render(<SurveyDocuments surveyId="doc1" />);

    await waitFor(() => expect(screen.getByText('Test Document 1')).toBeInTheDocument());

    const card = screen.getByText('Test Document 1').closest('[role="button"]');
    expect(card).not.toBeNull();
    fireEvent.click(card as HTMLElement);

    expect(routerPush).toHaveBeenCalledWith('/home/editor/doc1');
  });

  it('applies custom className when provided', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok(mockDocuments));

    const { container } = render(<SurveyDocuments surveyId="doc1" className="custom-class" />);

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  it('reloads documents when surveyId changes', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok(mockDocuments));

    const { rerender } = render(<SurveyDocuments surveyId="doc1" />);

    await waitFor(() => {
      expect(documentStore.list).toHaveBeenCalledTimes(1);
    });

    rerender(<SurveyDocuments surveyId="doc2" />);

    await waitFor(() => {
      expect(documentStore.list).toHaveBeenCalledTimes(2);
    });
  });

  it('allows deleting a document after confirmation via menu', async () => {
    (documentStore.list as jest.Mock)
      .mockResolvedValueOnce(Ok(mockDocuments))
      .mockResolvedValueOnce(Ok([]));
    (documentStore.remove as jest.Mock).mockResolvedValue(Ok(undefined));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SurveyDocuments surveyId="doc1" />);

    await screen.findByText('Test Document 1');

    fireEvent.click(screen.getAllByRole('button', { name: /^delete/i })[0]);

    await waitFor(() => expect(documentStore.remove).toHaveBeenCalledWith('doc1'));
    expect(confirmSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('does not delete when user cancels confirm dialog', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok(mockDocuments));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SurveyDocuments surveyId="doc1" />);

    await screen.findByText('Test Document 1');

    fireEvent.click(screen.getAllByRole('button', { name: /^delete/i })[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(documentStore.remove).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
