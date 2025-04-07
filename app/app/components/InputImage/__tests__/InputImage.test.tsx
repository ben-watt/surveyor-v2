import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InputImage from '../InputImage';
import { imageUploadStore } from '@/app/app/clients/ImageUploadStore';
import path from 'path';
import { FilePondFile, FileOrigin } from 'filepond';
import { imageUploadStatusStore } from '../imageUploadStatusStore';

// Mock FilePond and its plugins
jest.mock('react-filepond', () => ({
  registerPlugin: jest.fn(),
  FilePond: ({ onremovefile, onupdatefiles, onaddfilestart, onaddfile, onprocessfile }: { 
    onremovefile: (file: FilePondFile) => void;
    onupdatefiles: (files: FilePondFile[]) => void;
    onaddfilestart: (file: FilePondFile) => void;
    onaddfile: (error: Error | null, file: FilePondFile) => void;
    onprocessfile: (error: Error | null, file: FilePondFile) => void;
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
      origin: FileOrigin.INPUT,
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
        <button 
          aria-label="trigger file start" 
          onClick={() => {
            const fileWithInputOrigin = { ...mockFile, origin: FileOrigin.INPUT };
            onaddfilestart(fileWithInputOrigin);
            onaddfile(null, fileWithInputOrigin);
            onprocessfile(null, fileWithInputOrigin);
          }}
        >
          Trigger Upload
        </button>
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

// Mock the imageUploadStatusStore
jest.mock('../imageUploadStatusStore', () => ({
  imageUploadStatusStore: {
    setUploading: jest.fn(),
    setUploaded: jest.fn(),
    isUploading: jest.fn(),
    subscribe: jest.fn().mockImplementation((callback) => {
      return jest.fn(); // return unsubscribe function
    }),
  },
}));

// Mock the imageUploadStore
jest.mock('@/app/app/clients/ImageUploadStore', () => ({
  imageUploadStore: {
    list: jest.fn().mockResolvedValue({ ok: true, val: [] }),
    get: jest.fn().mockResolvedValue({ 
      ok: true, 
      val: {
        path: '/test/path/image1.jpg',
        href: 'http://example.com/image1.jpg',
        syncStatus: 'synced',
        file: { size: 1024, type: 'image/jpeg' }
      }
    }),
    remove: jest.fn().mockResolvedValue(undefined),
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
    
    // Default mock implementations
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: [] });
  });

  it('renders loading state initially', async () => {
    render(<InputImage path={mockPath} onChange={mockOnChange} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Wait for loading to complete to avoid act warnings
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
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

    await act(async () => {
      render(<InputImage path={mockPath} onChange={mockOnChange} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(mockOnChange).toHaveBeenCalledWith(['/test/path/image1.jpg']);
  });

  it('handles error when loading initial files', async () => {
    (imageUploadStore.list as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    await act(async () => {
      render(<InputImage path={mockPath} onChange={mockOnChange} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('respects maxNumberOfFiles prop', async () => {
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: [] });

    await act(async () => {
      render(<InputImage path={mockPath} onChange={mockOnChange} maxNumberOfFiles={3} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const filePondWrapper = screen.getByTestId('filepond-wrapper');
    expect(filePondWrapper).toHaveAttribute('data-max-files', '3');
  });

  it('updates file sources correctly when files change', async () => {
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: [] });

    await act(async () => {
      render(<InputImage path={mockPath} onChange={mockOnChange} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Simulate file update
    const fileInput = screen.getByTestId('filepond').querySelector('input[type="file"]');
    await act(async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput!, {
        target: {
          files: [file],
        },
      });
    });

    expect(mockOnChange).toHaveBeenCalledWith(['/test/path/test.jpg']);
  });

  it('handles file type restrictions correctly', async () => {
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: [] });

    await act(async () => {
      render(<InputImage path={mockPath} onChange={mockOnChange} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const filePondWrapper = screen.getByTestId('filepond-wrapper');
    expect(filePondWrapper).toHaveAttribute('data-accepted-file-types', 'image/*');
  });
  
  it('tracks upload status without re-rendering', async () => {
    (imageUploadStore.list as jest.Mock).mockResolvedValue({ ok: true, val: [] });

    await act(async () => {
      render(<InputImage path={mockPath} onChange={mockOnChange} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Simulate file upload start
    await act(async () => {
      fireEvent.click(screen.getByLabelText('trigger file start'));
    });

    // Verify that the status store is updated correctly
    expect(imageUploadStatusStore.setUploading).toHaveBeenCalledWith(mockPath, true);
    
    // Simulate upload complete
    await act(async () => {
      fireEvent.click(screen.getByLabelText('trigger file start'));
    });
    
    expect(imageUploadStatusStore.setUploaded).toHaveBeenCalledWith(mockPath);
  });
}); 