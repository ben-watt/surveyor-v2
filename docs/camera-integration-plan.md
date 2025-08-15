# Camera Integration Plan

## Overview

This document outlines the implementation plan for adding multi-photo camera capture functionality to the surveyor application. The goal is to allow users to take multiple photos without leaving the app, eliminating the need to navigate back and forth between the camera app and the surveyor app.

## Current Architecture Analysis

### Existing Components

**DropZoneInputImage** (`app/home/components/InputImage/DropZoneInputImage.tsx`)
- Supports drag-drop and device file selection
- Image resizing with `react-image-file-resizer` (500x400px, JPEG, 100% quality)
- Thumbnail display with metadata, archive, and delete functionality
- Integration with `imageUploadStore` for offline-first uploads

**ImageUploadStore** (`app/home/clients/ImageUploadStore.ts`)
- ✅ Offline queue system with `SyncStatus.Queued`
- ✅ Background sync logic with automatic retry
- ✅ IndexedDB persistence via Dexie
- ✅ Upload status tracking
- ✅ Archive functionality
- ✅ Metadata handling
- ✅ Multi-tenant data isolation

**PWA Infrastructure**
- Serwist service worker configured
- Offline-first architecture with IndexedDB
- Background sync capability already implemented

## Implementation Approaches

### Approach 1: Enhanced Capture Modal (Quick Win)
**Timeline**: 1-2 weeks | **Effort**: Medium

Create a camera modal within the existing DropZoneInputImage component:

#### Key Components
1. **CameraModal.tsx** - Full-screen camera interface with live preview
2. **useCameraStream.ts** - Custom hook for getUserMedia management
3. **Enhanced DropZoneInputImage** - Add camera button alongside file upload

#### Features
- Live camera preview using `getUserMedia()`
- Front/rear camera switching on mobile devices
- Multiple photo capture in sequence
- Immediate thumbnail preview
- Batch processing using existing image upload pipeline

#### Implementation Details
```typescript
// Camera modal with live preview
const stream = await navigator.mediaDevices.getUserMedia({
  video: { 
    facingMode: 'environment', // Rear camera for surveys
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  }
});

// Capture photo to canvas
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
context.drawImage(videoElement, 0, 0);
const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

// Process through existing pipeline
const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
// Use existing resizing and upload logic
```

### Approach 2: PWA Camera Integration (Future Enhancement)
**Timeline**: 2-3 weeks | **Effort**: Medium (reduced due to existing infrastructure)

Leverage existing PWA infrastructure for native-like camera experience:

#### Enhanced Features
- Full-screen camera app interface
- Background processing with service worker
- Advanced camera controls (zoom, flash, focus)
- Batch upload optimization
- Install prompts for PWA camera experience

#### Service Worker Integration
```typescript
// Service worker handles background sync using existing logic
self.addEventListener('sync', event => {
  if (event.tag === 'camera-upload') {
    // Use existing imageUploadStore.sync() method
    event.waitUntil(imageUploadStore.sync());
  }
});
```

## Implementation Plan - Phase 1 (Approach 1)

### Files to Create

**1. Camera Hook**
```typescript
// app/home/hooks/useCameraStream.ts
export const useCameraStream = (constraints?: MediaStreamConstraints) => {
  // Manage getUserMedia lifecycle
  // Handle device enumeration
  // Camera switching logic
  // Cleanup on unmount
}
```

**2. Camera Modal Component**
```typescript
// app/home/components/InputImage/CameraModal.tsx
export const CameraModal = ({
  isOpen,
  onClose,
  onCapture,
  path
}) => {
  // Full-screen camera interface
  // Live video preview
  // Capture controls
  // Device switching
}
```

**3. Camera Preview Component**
```typescript
// app/home/components/InputImage/CameraPreview.tsx
export const CameraPreview = ({ 
  stream, 
  onCapture,
  isCapturing 
}) => {
  // Video element with stream
  // Capture button
  // Camera controls overlay
}
```

### Files to Modify

**DropZoneInputImage.tsx**
- Add camera button alongside existing upload options
- Integrate CameraModal with existing file processing pipeline
- Maintain compatibility with current features (metadata, archiving)

### Integration with Existing Systems

#### Image Processing Pipeline
1. Camera captures → Canvas conversion → Blob creation
2. File object creation with proper naming
3. **Reuse existing resizing logic** from `react-image-file-resizer`
4. **Leverage existing upload queue** via `imageUploadStore.create()`
5. **Maintain metadata support** and archiving functionality

#### Mobile Optimization
- Default to rear camera (`facingMode: 'environment'`)
- Touch-optimized capture controls
- Responsive full-screen layout
- Proper permission handling and error states

## Technical Considerations

### Browser Compatibility
- `getUserMedia()` requires HTTPS or localhost
- Modern browser support (Chrome 53+, Firefox 36+, Safari 11+)
- Mobile device camera access permissions

### Performance Optimization
- Stream cleanup on component unmount
- Canvas rendering optimization for photo capture
- Memory management for multiple photo captures

### Error Handling
- Camera permission denied
- No cameras available
- Camera access conflicts
- Network connectivity for uploads

### Testing Strategy
- Cross-device testing (desktop, mobile, tablet)
- Different camera configurations
- Permission scenarios
- Offline/online upload behavior

## Success Metrics

1. **User Experience**: Users can capture multiple photos without leaving the app
2. **Performance**: No impact on existing upload/sync performance
3. **Reliability**: Consistent camera access across devices
4. **Integration**: Seamless integration with existing image management features

## Future Enhancements (Phase 2)

- PWA camera app with background sync
- Advanced camera controls (zoom, flash, focus)
- Burst photo mode
- Time-lapse functionality
- QR code scanning integration
- Image annotation before upload

## Risk Mitigation

- **Fallback Strategy**: Camera modal fails → graceful fallback to existing file upload
- **Progressive Enhancement**: Camera features enhance existing functionality without breaking it
- **Device Compatibility**: Comprehensive testing across target devices
- **Permission Handling**: Clear user guidance for camera permissions