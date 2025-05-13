import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentList } from '../../app/home/components/DocumentList';
import { documentStore } from '../../app/home/clients/DocumentStore';

jest.mock('../../app/home/clients/DocumentStore');

const mockDocuments = [
  {
    id: 'doc1',
    displayName: 'First Document',
    lastModified: '2024-06-01T12:00:00Z',
  },
  {
    id: 'doc2',
    displayName: 'Second Document',
    lastModified: '2024-06-02T12:00:00Z',
  },
];

describe('DocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (documentStore.list as jest.Mock).mockResolvedValue({ ok: true, val: mockDocuments });
    (documentStore.rename as jest.Mock).mockResolvedValue({ ok: true, val: { ...mockDocuments[0], displayName: 'Renamed' } });
    (documentStore.remove as jest.Mock).mockResolvedValue({ ok: true });
  });

  it('renders the list of documents', async () => {
    render(<DocumentList />);
    expect(await screen.findByText('First Document')).toBeInTheDocument();
    expect(screen.getByText('Second Document')).toBeInTheDocument();
  });

  it('enters rename mode when clicking the document name', async () => {
    render(<DocumentList />);
    const name = await screen.findByText('First Document');
    fireEvent.click(name);
    expect(screen.getByRole('textbox', { name: /rename document/i })).toBeInTheDocument();
  });

  it('saves new name on Enter', async () => {
    render(<DocumentList />);
    const name = await screen.findByText('First Document');
    fireEvent.click(name);
    const input = screen.getByRole('textbox', { name: /rename document/i });
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(documentStore.rename).toHaveBeenCalledWith('doc1', 'Renamed'));
    expect(await screen.findByText('Renamed')).toBeInTheDocument();
  });

  it('cancels rename on Escape', async () => {
    render(<DocumentList />);
    const name = await screen.findByText('First Document');
    fireEvent.click(name);
    const input = screen.getByRole('textbox', { name: /rename document/i });
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: /rename document/i })).not.toBeInTheDocument();
    expect(screen.getByText('First Document')).toBeInTheDocument();
  });

  it('cancels rename on blur', async () => {
    render(<DocumentList />);
    const name = await screen.findByText('First Document');
    fireEvent.click(name);
    const input = screen.getByRole('textbox', { name: /rename document/i });
    fireEvent.blur(input);
    expect(screen.queryByRole('textbox', { name: /rename document/i })).not.toBeInTheDocument();
    expect(screen.getByText('First Document')).toBeInTheDocument();
  });

  it('shows error if name is empty', async () => {
    render(<DocumentList />);
    const name = await screen.findByText('First Document');
    fireEvent.click(name);
    const input = screen.getByRole('textbox', { name: /rename document/i });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Name cannot be empty')).toBeInTheDocument());
  });

  it('is accessible: name is focusable and can be activated with Enter/Space', async () => {
    render(<DocumentList />);
    const name = await screen.findByText('First Document');
    name.focus();
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(screen.getByRole('textbox', { name: /rename document/i })).toBeInTheDocument();
  });
}); 