import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SurveyDocuments } from '@/app/home/components/SurveyDocuments';
import { documentStore } from '@/app/home/clients/DocumentStore';
import { Ok, Err } from 'ts-results';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the document store
jest.mock('@/app/home/clients/DocumentStore', () => ({
  documentStore: {
    list: jest.fn(),
  },
}));

describe('SurveyDocuments', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockDocuments = [
    {
      id: 'doc1',
      displayName: 'Test Document 1',
      version: 2,
      updatedAt: '2024-03-20T10:00:00Z',
      metadata: {
        tags: ['survey-123'],
      },
    },
    {
      id: 'doc1',
      displayName: 'Test Document 2',
      version: 1,
      updatedAt: '2024-03-19T10:00:00Z',
      metadata: {
        tags: ['survey-123'],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
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

  it('renders empty state when no documents are found', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok([]));
    
    render(<SurveyDocuments surveyId="no-documents" />);
    
    await waitFor(() => {
      expect(screen.getByText('No reports found for this survey')).toBeInTheDocument();
    });
  });

  it('renders documents sorted by version', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok(mockDocuments));
    
    render(<SurveyDocuments surveyId="doc1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
      expect(screen.getByText('Test Document 2')).toBeInTheDocument();
      
      // Check version information
      expect(screen.getByText(/Version 2/)).toBeInTheDocument();
      expect(screen.getByText(/Version 1/)).toBeInTheDocument();
      
      // Check dates - using the new dd/MM/yyyy format
      expect(screen.getByText(/20\/03\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/19\/03\/2024/)).toBeInTheDocument();
    });
  });

  it('navigates to editor when document is clicked', async () => {
    (documentStore.list as jest.Mock).mockResolvedValue(Ok(mockDocuments));
    
    render(<SurveyDocuments surveyId="doc1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    });

    const firstDocument = screen.getByText('Test Document 1').closest('a');
    expect(firstDocument).toHaveAttribute('href', '/home/editor/doc1');
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
}); 