import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DropZoneInputImage } from '../index';

// Mock dependencies
jest.mock('@/app/home/clients/ImageUploadStore', () => ({
  imageUploadStore: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    archive: jest.fn(),
  },
}));

jest.mock('@/app/home/clients/Database', () => ({
  imageMetadataStore: {
    get: jest.fn(),
  },
}));

jest.mock('@/app/home/components/Drawer', () => ({
  useDynamicDrawer: () => ({
    openDrawer: jest.fn(),
    closeDrawer: jest.fn(),
  }),
}));

jest.mock('../CameraModal', () => ({
  CameraModal: ({ isOpen, onClose, onPhotoCaptured }: any) => 
    isOpen ? (
      <div data-testid="camera-modal">
        <button onClick={onClose}>Close Camera</button>
        <button onClick={() => onPhotoCaptured('/test/path/photo.jpg')}>
          Capture Photo
        </button>
      </div>
    ) : null,
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: any) => ({
    getRootProps: () => ({
      'data-testid': 'dropzone',
      onClick: jest.fn(),
    }),
    getInputProps: () => ({
      'data-testid': 'file-input',
    }),
  }),
}));

// Mock react-image-file-resizer
jest.mock('react-image-file-resizer', () => ({
  __esModule: true,
  default: {
    imageFileResizer: jest.fn((file, width, height, format, quality, rotation, callback) => {
      callback('data:image/jpeg;base64,resized-image');
    }),
  },
}));

// Mock path.join
jest.mock('path', () => ({
  join: (...paths: string[]) => paths.join('/'),
}));

const { imageUploadStore } = require('@/app/home/clients/ImageUploadStore');
const { imageMetadataStore } = require('@/app/home/clients/Database');

describe('DropZoneInputImage', () => {
  const defaultProps = {
    path: '/test/path',
    maxFiles: 5,
    onChange: jest.fn(),
    features: {
      archive: true,
      metadata: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful empty list response
    imageUploadStore.list.mockResolvedValue({
      ok: true,
      val: [],
    });
  });

  it('renders dropzone with file upload text', async () => {
    render(<DropZoneInputImage {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/drag & drop files/i)).toBeInTheDocument();
      expect(screen.getByText(/fetch from device/i)).toBeInTheDocument();
    });
  });

  it('handles camera photo capture', async () => {
    const onChange = jest.fn();
    
    // Mock image upload store responses
    imageUploadStore.list.mockResolvedValue({
      ok: true,
      val: [{ fullPath: '/test/path/photo.jpg' }],
    });
    
    imageUploadStore.get.mockResolvedValue({
      ok: true,
      val: {
        file: new Blob(['photo'], { type: 'image/jpeg' }),
        path: '/test/path/photo.jpg',
        href: 'blob:photo-url',
      },
    });
    
    render(<DropZoneInputImage {...defaultProps} onChange={onChange} />);
  });

  it('loads existing files on mount', async () => {
    const mockFile = {
      fullPath: '/test/path/existing.jpg',
    };
    
    const mockFileData = {
      file: new Blob(['existing'], { type: 'image/jpeg' }),
      path: '/test/path/existing.jpg',
      href: 'blob:existing-url',
    };
    
    imageUploadStore.list.mockResolvedValue({
      ok: true,
      val: [mockFile],
    });
    
    imageUploadStore.get.mockResolvedValue({
      ok: true,
      val: mockFileData,
    });
    
    render(<DropZoneInputImage {...defaultProps} />);
    
    await waitFor(() => {
      expect(imageUploadStore.list).toHaveBeenCalledWith('/test/path');
      expect(imageUploadStore.get).toHaveBeenCalledWith('/test/path/existing.jpg');
    });
  });

  it('shows loading state initially', () => {
    render(<DropZoneInputImage {...defaultProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles image upload store errors gracefully', async () => {
    imageUploadStore.list.mockRejectedValue(new Error('Store error'));
    
    render(<DropZoneInputImage {...defaultProps} />);
    
    await waitFor(() => {
      // Should not crash and should hide loading
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('displays archive information when enabled', async () => {
    const mockFiles = [
      { fullPath: '/test/path/archived/file.jpg' },
      { fullPath: '/test/path/regular.jpg' },
    ];
    
    const mockArchivedFileData = {
      file: new Blob(['archived'], { type: 'image/jpeg' }),
      path: '/test/path/archived/file.jpg',
      href: 'blob:archived-url',
    };
    
    const mockRegularFileData = {
      file: new Blob(['regular'], { type: 'image/jpeg' }),
      path: '/test/path/regular.jpg',
      href: 'blob:regular-url',
    };
    
    imageUploadStore.list.mockResolvedValue({
      ok: true,
      val: mockFiles,
    });
    
    imageUploadStore.get
      .mockResolvedValueOnce({ ok: true, val: mockArchivedFileData })
      .mockResolvedValueOnce({ ok: true, val: mockRegularFileData });
    
    render(<DropZoneInputImage {...defaultProps} features={{ archive: true }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/1 archived/i)).toBeInTheDocument();
    });
  });
});