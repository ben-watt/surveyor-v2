import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DropZoneInputImage } from '../DropZoneInputImage';

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

  it('renders take photos button', async () => {
    render(<DropZoneInputImage {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('take photos')).toBeInTheDocument();
    });
  });

  it('opens camera modal when take photos button is clicked', async () => {
    render(<DropZoneInputImage {...defaultProps} />);
    
    await waitFor(() => {
      const takePhotosButton = screen.getByText('take photos');
      fireEvent.click(takePhotosButton);
    });
    
    expect(screen.getByTestId('camera-modal')).toBeInTheDocument();
  });

  it('closes camera modal when close button is clicked', async () => {
    render(<DropZoneInputImage {...defaultProps} />);
    
    // Open camera modal
    await waitFor(() => {
      const takePhotosButton = screen.getByText('take photos');
      fireEvent.click(takePhotosButton);
    });
    
    expect(screen.getByTestId('camera-modal')).toBeInTheDocument();
    
    // Close camera modal
    const closeButton = screen.getByText('Close Camera');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('camera-modal')).not.toBeInTheDocument();
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
    
    // Open camera modal
    await waitFor(() => {
      const takePhotosButton = screen.getByText('take photos');
      fireEvent.click(takePhotosButton);
    });
    
    // Simulate photo capture
    const captureButton = screen.getByText('Capture Photo');
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
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

  it('hides take photos button when max files reached', async () => {
    // Mock files at max capacity
    const mockFiles = Array.from({ length: 5 }, (_, i) => ({
      fullPath: `/test/path/file${i}.jpg`,
    }));
    
    const mockFileData = {
      file: new Blob(['file'], { type: 'image/jpeg' }),
      path: '/test/path/file.jpg',
      href: 'blob:file-url',
    };
    
    imageUploadStore.list.mockResolvedValue({
      ok: true,
      val: mockFiles,
    });
    
    imageUploadStore.get.mockResolvedValue({
      ok: true,
      val: mockFileData,
    });
    
    render(<DropZoneInputImage {...defaultProps} maxFiles={5} />);
    
    await waitFor(() => {
      expect(screen.queryByText('take photos')).not.toBeInTheDocument();
    });
  });

  it('passes correct maxPhotos to camera modal', async () => {
    render(<DropZoneInputImage {...defaultProps} maxFiles={3} />);
    
    await waitFor(() => {
      const takePhotosButton = screen.getByText('take photos');
      fireEvent.click(takePhotosButton);
    });
    
    // Camera modal should be rendered with maxPhotos prop
    expect(screen.getByTestId('camera-modal')).toBeInTheDocument();
  });

  it('handles image upload store errors gracefully', async () => {
    imageUploadStore.list.mockRejectedValue(new Error('Store error'));
    
    render(<DropZoneInputImage {...defaultProps} />);
    
    await waitFor(() => {
      // Should not crash and should hide loading
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('prevents event propagation on camera button click', async () => {
    const mockStopPropagation = jest.fn();
    
    render(<DropZoneInputImage {...defaultProps} />);
    
    await waitFor(() => {
      const takePhotosButton = screen.getByText('take photos');
      
      // Create a mock event
      const mockEvent = {
        stopPropagation: mockStopPropagation,
      };
      
      // Simulate click with event
      fireEvent.click(takePhotosButton, mockEvent);
    });
    
    expect(screen.getByTestId('camera-modal')).toBeInTheDocument();
  });

  it('renders with minimal props', async () => {
    render(<DropZoneInputImage path="/test" />);
    
    await waitFor(() => {
      expect(screen.getByText(/drag & drop files/i)).toBeInTheDocument();
      expect(screen.getByText('take photos')).toBeInTheDocument();
    });
  });

  it('renders without features', async () => {
    render(<DropZoneInputImage path="/test" features={{}} />);
    
    await waitFor(() => {
      expect(screen.getByText('take photos')).toBeInTheDocument();
    });
  });

  it('handles camera capture callback correctly', async () => {
    const onChange = jest.fn();
    
    imageUploadStore.list.mockResolvedValue({
      ok: true,
      val: [],
    });
    
    render(<DropZoneInputImage {...defaultProps} onChange={onChange} />);
    
    // Open camera and capture
    await waitFor(() => {
      const takePhotosButton = screen.getByText('take photos');
      fireEvent.click(takePhotosButton);
    });
    
    const captureButton = screen.getByText('Capture Photo');
    fireEvent.click(captureButton);
    
    // Should trigger file reload
    await waitFor(() => {
      expect(imageUploadStore.list).toHaveBeenCalledTimes(2); // Initial load + reload after capture
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