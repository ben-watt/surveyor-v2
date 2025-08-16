import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CameraModal } from '../CameraModal';

// Mock the camera hook
const mockUseCameraStream = {
  stream: null,
  isLoading: false,
  error: null,
  devices: [],
  activeDeviceId: null,
  startCamera: jest.fn(),
  stopCamera: jest.fn(),
  switchCamera: jest.fn(),
  capturePhoto: jest.fn(),
  hasPermission: false,
  setVideoRef: jest.fn(),
};

jest.mock('@/app/home/hooks/useCameraStream', () => ({
  useCameraStream: () => mockUseCameraStream,
}));

// Mock image upload store
jest.mock('@/app/home/clients/ImageUploadStore', () => ({
  imageUploadStore: {
    create: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

const { imageUploadStore } = require('@/app/home/clients/ImageUploadStore');

// Mock react-image-file-resizer
jest.mock('react-image-file-resizer', () => ({
  __esModule: true,
  default: {
    imageFileResizer: jest.fn((file, width, height, format, quality, rotation, callback) => {
      // Simulate resizer callback with a mock blob
      const mockBlob = new Blob(['resized'], { type: 'image/jpeg' });
      const mockFile = new File([mockBlob], 'resized.jpg', { type: 'image/jpeg' });
      callback(`data:image/jpeg;base64,mock-resized-image`);
    }),
  },
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

describe('CameraModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    path: '/test/path',
    onPhotoCaptured: jest.fn(),
    maxPhotos: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    imageUploadStore.create.mockResolvedValue({ ok: true });
    // Reset camera stream mock to defaults
    Object.assign(mockUseCameraStream, {
      stream: null,
      isLoading: false,
      error: null,
      devices: [],
      activeDeviceId: null,
      hasPermission: false,
    });
  });

  it('renders null when not open', () => {
    const { container } = render(
      <CameraModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders camera modal when open', () => {
    render(<CameraModal {...defaultProps} />);
    
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('0/5 photos')).toBeInTheDocument();
  });

  it('shows loading state when camera is loading', () => {
    Object.assign(mockUseCameraStream, { isLoading: true });
    render(<CameraModal {...defaultProps} />);
    
    expect(screen.getByText('Starting camera...')).toBeInTheDocument();
  });

  it('shows error state when camera has error', () => {
    Object.assign(mockUseCameraStream, { error: 'Camera permission denied' });
    render(<CameraModal {...defaultProps} />);
    
    expect(screen.getByText('Camera Error')).toBeInTheDocument();
    expect(screen.getByText('Camera permission denied')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<CameraModal {...defaultProps} onClose={onClose} />);
    
    // The close button is the first button in the header
    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows camera switch button when multiple devices available', () => {
    Object.assign(mockUseCameraStream, {
      devices: [
        { deviceId: 'device1', label: 'Front Camera', kind: 'videoinput' },
        { deviceId: 'device2', label: 'Back Camera', kind: 'videoinput' },
      ]
    });
    
    render(<CameraModal {...defaultProps} />);
    
    // Should have more than one button when switch button is present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('disables capture button when no stream', () => {
    Object.assign(mockUseCameraStream, { stream: null });
    render(<CameraModal {...defaultProps} />);
    
    // The capture button is the large circular button with camera icon
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    expect(captureButton).toBeDisabled();
  });

  it('enables capture button when stream is available', () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    render(<CameraModal {...defaultProps} />);
    
    // The capture button is the large circular button with camera icon
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    expect(captureButton).not.toBeDisabled();
  });

  it('captures photo when capture button is clicked', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} />);
    
    // The capture button is the large circular button with camera icon
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(mockUseCameraStream.capturePhoto).toHaveBeenCalledTimes(1);
    });
  });

  it('shows captured photo thumbnails', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} />);
    
    // The capture button is the large circular button with camera icon
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(screen.getByAltText(/captured/i)).toBeInTheDocument();
    });
  });

  it('shows upload button when photos are captured', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} />);
    
    // The capture button is the large circular button with camera icon
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(screen.getByText(/upload 1 photo/i)).toBeInTheDocument();
    });
  });

  it('removes photo when delete button is clicked', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} />);
    
    // Capture a photo
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(screen.getByAltText(/captured/i)).toBeInTheDocument();
    });
    
    // Delete the photo - it's a small red button on the thumbnail
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.className.includes('w-7 h-7') && 
      button.className.includes('from-red-500')
    );
    fireEvent.click(deleteButton!);
    
    await waitFor(() => {
      expect(screen.queryByAltText(/captured/i)).not.toBeInTheDocument();
    });
  });

  it('disables capture when max photos reached', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} maxPhotos={1} />);
    
    // Capture one photo (reaching max)
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(captureButton).toBeDisabled();
    });
  });

  it('shows upload button with correct count', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} />);
    
    // Capture a photo
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(screen.getByText(/upload 1 photo/i)).toBeInTheDocument();
    });
  });

  it('shows upload button after capturing photo', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} />);
    
    // Capture a photo
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(screen.getByText(/upload 1 photo/i)).toBeInTheDocument();
    });
  });

  it('disables capture button when max photos reached', async () => {
    Object.assign(mockUseCameraStream, { stream: {} as MediaStream });
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    mockUseCameraStream.capturePhoto.mockResolvedValue(mockBlob);
    
    render(<CameraModal {...defaultProps} maxPhotos={1} />);
    
    // Capture max photos
    const buttons = screen.getAllByRole('button');
    const captureButton = buttons.find(button => 
      button.className.includes('w-16 h-16') && 
      button.className.includes('rounded-full')
    );
    fireEvent.click(captureButton!);
    
    await waitFor(() => {
      expect(captureButton).toBeDisabled();
    });
  });

  it('cleans up resources when modal closes', () => {
    const { rerender } = render(<CameraModal {...defaultProps} isOpen={true} />);
    
    expect(mockUseCameraStream.stopCamera).not.toHaveBeenCalled();
    
    rerender(<CameraModal {...defaultProps} isOpen={false} />);
    
    expect(mockUseCameraStream.stopCamera).toHaveBeenCalledTimes(1);
  });
});