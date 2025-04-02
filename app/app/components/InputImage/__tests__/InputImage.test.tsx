import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InputImage from '../InputImage';
import { imageUploadStore } from '@/app/app/clients/ImageUploadStore';
import path from 'path';
import { FilePondFile } from 'filepond';

// Mock FilePond and its plugins
jest.mock('react-filepond', () => ({
  registerPlugin: jest.fn(),
  FilePond: ({ onremovefile, onupdatefiles }: { 
    onremovefile: (file: FilePondFile) => void;
    onupdatefiles: (files: FilePondFile[]) => void;
  }) => {
    const mockFile = {
      source: '/test/path/image1.jpg',
      getMetadata: jest.fn().mockImplementation((key) => {
        if (key === 'uploadId') {
          return '/test/path/image1.jpg';
        }
        return null;
      }),
      setMetadata: jest.fn(),
      requestPrepare: jest.fn().mockResolvedValue(new Blob(['test'])),
      file: new File(['test'], 'image1.jpg', { type: 'image/jpeg' }),
      id: '1',
      serverId: '1',
      status: 1,
      origin: 1,
      filename: 'image1.jpg',
      filenameWithoutExtension: 'image1',
      fileExtension: '.jpg',
      fileSize: 1024,
      fileType: 'image/jpeg',
      abortLoad: jest.fn(),
      abortProcessing: jest.fn()
    };

    return (
      <div data-testid="filepond">
        <button aria-label="remove file" onClick={() => onremovefile(mockFile)}>Remove</button>
        <input type="file" onChange={(e) => {
          const files = Array.from(e.target.files || []).map(file => ({
            ...mockFile,
            source: file,
            file: file,
            filename: file.name,
            filenameWithoutExtension: file.name.split('.')[0],
            fileExtension: '.' + file.name.split('.').pop(),
            fileSize: file.size,
            fileType: file.type,
            getMetadata: jest.fn().mockImplementation((key) => {
              if (key === 'uploadId') {
                return path.join('/test/path', file.name);
              }
              return null;
            })
          }));
          onupdatefiles(files);
        }} />
      </div>
    );
  }
}));

jest.mock('filepond-plugin-image-preview', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('filepond-plugin-image-exif-orientation', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('filepond-plugin-file-poster', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('filepond-plugin-image-resize', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('filepond-plugin-image-transform', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the imageUploadStore
jest.mock('@/app/app/clients/ImageUploadStore', () => ({
  imageUploadStore: {
    list: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
  },
}));

// Mock the styles
jest.mock('filepond/dist/filepond.min.css', () => ({}));
jest.mock('filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css', () => ({}));
jest.mock('filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css', () => ({}));

// Mock path module to ensure consistent path separators
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: (...args: string[]) => args.join('/').replace(/\\/g, '/')
}));

describe('InputImage', () => {
  const mockPath = '/test/path';
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<InputImage path={mockPath} onChange={mockOnChange} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads and displays initial files correctly', async () => {
    const mockFiles = [{ fullPath: '/test/path/image1.jpg' }];
    const mockFileData = {
      path: '/test/path/image1.jpg',
      href: 'http://example.com/image1.jpg',
      syncStatus: 'synced',
      file: { size: 1024, type: 'image/jpeg' }
    };

    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: mockFiles });
    (imageUploadStore.get as jest.Mock).mockResolvedValue({ ok: true, val: mockFileData });

    render(<InputImage path={mockPath} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(mockOnChange).toHaveBeenCalledWith(['/test/path/image1.jpg']);
  });

  it('handles error when loading initial files', async () => {
    (imageUploadStore.list as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    render(<InputImage path={mockPath} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('respects maxNumberOfFiles prop', async () => {
    const mockFiles = [{ fullPath: '/test/path/image1.jpg' }];
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: mockFiles });

    render(<InputImage path={mockPath} onChange={mockOnChange} maxNumberOfFiles={3} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const filePondWrapper = screen.getByTestId('filepond-wrapper');
    expect(filePondWrapper).toHaveAttribute('data-max-files', '3');
  });

  it('updates file sources correctly when files change', async () => {
    const mockFiles = [{ fullPath: '/test/path/image1.jpg' }];
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: mockFiles });

    render(<InputImage path={mockPath} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Simulate file update
    const fileInput = screen.getByTestId('filepond').querySelector('input[type="file"]');
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput!, {
      target: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(['/test/path/test.jpg']);
    });
  });

  it('handles file type restrictions correctly', async () => {
    const mockFiles = [{ fullPath: '/test/path/image1.jpg' }];
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: mockFiles });

    render(<InputImage path={mockPath} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const filePondWrapper = screen.getByTestId('filepond-wrapper');
    expect(filePondWrapper).toHaveAttribute('data-accepted-file-types', 'image/*');
  });
}); 