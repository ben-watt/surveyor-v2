# Capacitor Native Camera Migration Plan

## Executive Summary

This document outlines the migration from the current PWA-based camera implementation (`CameraModal.tsx`) to a native camera solution using Capacitor. This migration will provide access to native device APIs for enhanced camera functionality including better performance, hardware-specific features, and improved user experience.

## Current State Analysis

### Existing Implementation

- **Component**: `app/home/components/InputImage/CameraModal.tsx`
- **Technology**: WebRTC MediaStream API (getUserMedia)
- **Limitations**:
  - Limited hardware zoom control (fallback to CSS scaling)
  - No access to native camera features (HDR, night mode, etc.)
  - Browser-dependent permission model
  - No native image processing capabilities
  - Limited performance on mobile devices

### Current Features

- Multi-camera support (front/rear switching)
- Basic zoom (CSS-based fallback)
- Photo capture and preview
- Batch photo upload
- Image resizing (500x400px)
- Offline-first with IndexedDB storage

## Capacitor Migration Architecture

### 1. Technology Stack Changes

```typescript
// New Dependencies
{
  "@capacitor/core": "^6.0.0",
  "@capacitor/camera": "^6.0.0",
  "@capacitor/filesystem": "^6.0.0",
  "@capacitor/ios": "^6.0.0",
  "@capacitor/android": "^6.0.0",
  "@capacitor/cli": "^6.0.0"
}
```

### 2. Project Structure

```
surveyor-v2/
├── capacitor.config.ts              # Capacitor configuration
├── ios/                             # iOS native project
├── android/                         # Android native project
├── app/
│   ├── home/
│   │   ├── components/
│   │   │   └── InputImage/
│   │   │       ├── NativeCameraModal.tsx    # New native implementation
│   │   │       └── CameraModal.tsx          # Fallback for web
│   │   └── hooks/
│   │       └── useNativeCamera.ts           # Native camera hook
│   └── utils/
│       └── capacitor/
│           ├── camera.ts            # Camera utilities
│           └── platform.ts          # Platform detection
```

## Implementation Plan

### Phase 1: Capacitor Setup (Week 1)

#### 1.1 Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

#### 1.2 Add Platforms

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

#### 1.3 Configure Capacitor

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.surveyor',
  appName: 'Surveyor',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
      quality: 90,
      allowEditing: false,
      resultType: 'uri',
      saveToGallery: false,
    },
  },
};

export default config;
```

#### 1.4 Update Next.js Build Configuration

```javascript
// next.config.js modifications
module.exports = {
  output: 'export', // Required for Capacitor
  images: {
    unoptimized: true, // Required for static export
  },
};
```

### Phase 2: Native Camera Implementation (Week 2)

#### 2.1 Create Platform Detection Utility

```typescript
// app/utils/capacitor/platform.ts
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
};
```

#### 2.2 Native Camera Hook

```typescript
// app/home/hooks/useNativeCamera.ts
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useState, useCallback } from 'react';

interface NativeCameraOptions {
  quality?: number;
  maxPhotos: number;
  path: string;
}

export const useNativeCamera = ({ quality = 90, maxPhotos, path }: NativeCameraOptions) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const capturePhoto = useCallback(async () => {
    setIsCapturing(true);
    try {
      const photo = await Camera.getPhoto({
        quality,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
      });

      // Convert to blob for consistency with existing pipeline
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();

      return {
        blob,
        uri: photo.webPath!,
        format: photo.format,
      };
    } catch (error) {
      console.error('Native camera error:', error);
      throw error;
    } finally {
      setIsCapturing(false);
    }
  }, [quality]);

  const pickFromGallery = useCallback(async () => {
    const photos = await Camera.pickImages({
      quality,
      limit: maxPhotos,
    });
    return photos.photos;
  }, [quality, maxPhotos]);

  return {
    capturePhoto,
    pickFromGallery,
    photos,
    isCapturing,
  };
};
```

#### 2.3 Native Camera Modal Component

```typescript
// app/home/components/InputImage/NativeCameraModal.tsx
import { useNativeCamera } from '@/app/home/hooks/useNativeCamera';
import { imageUploadStore } from '@/app/home/clients/ImageUploadStore';
import { join } from 'path';
import Resizer from 'react-image-file-resizer';

interface NativeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string;
  onPhotoCaptured?: (filePath: string) => void;
  maxPhotos?: number;
}

export const NativeCameraModal = ({
  isOpen,
  onClose,
  path,
  onPhotoCaptured,
  maxPhotos = 10,
}: NativeCameraModalProps) => {
  const { capturePhoto, pickFromGallery, isCapturing } = useNativeCamera({
    maxPhotos,
    path,
  });

  // Reuse existing resize and upload logic
  // Integrate with native camera APIs
  // Implement native UI for photo review
};
```

### Phase 3: Progressive Enhancement (Week 3)

#### 3.1 Conditional Component Loading

```typescript
// app/home/components/InputImage/index.tsx
import dynamic from 'next/dynamic';
import { isNativePlatform } from '@/app/utils/capacitor/platform';

const CameraModal = dynamic(
  () =>
    isNativePlatform()
      ? import('./NativeCameraModal').then((mod) => mod.NativeCameraModal)
      : import('./CameraModal').then((mod) => mod.CameraModal),
  { ssr: false },
);
```

#### 3.2 Native Permissions Handling

```typescript
// app/utils/capacitor/permissions.ts
import { Camera } from '@capacitor/camera';

export const requestCameraPermissions = async () => {
  const permissions = await Camera.requestPermissions();
  return permissions.camera === 'granted';
};

export const checkCameraPermissions = async () => {
  const permissions = await Camera.checkPermissions();
  return permissions.camera === 'granted';
};
```

### Phase 4: Native Features Integration (Week 4)

#### 4.1 Advanced Camera Features

- **Flash Control**: Native flash modes (auto, on, off)
- **Focus/Exposure**: Tap to focus with exposure adjustment
- **HDR Mode**: Native HDR capture
- **Live Preview**: Native camera preview
- **Burst Mode**: Multiple rapid captures
- **RAW Capture**: Professional photo format (iOS)

#### 4.2 Native Image Processing

```typescript
// app/utils/capacitor/imageProcessing.ts
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const processNativeImage = async (photoUri: string) => {
  // Read image as base64
  const file = await Filesystem.readFile({
    path: photoUri,
    directory: Directory.Cache,
  });

  // Apply native compression/resizing
  // Convert to required format
  // Return processed blob
};
```

### Phase 5: Build & Deployment Pipeline (Week 5)

#### 5.1 Build Scripts

```json
// package.json additions
{
  "scripts": {
    "build:capacitor": "next build && next export",
    "cap:sync": "npx cap sync",
    "cap:copy": "npx cap copy",
    "ios": "npx cap open ios",
    "android": "npx cap open android",
    "build:ios": "npm run build:capacitor && npx cap sync ios",
    "build:android": "npm run build:capacitor && npx cap sync android"
  }
}
```

#### 5.2 CI/CD Configuration

```yaml
# .github/workflows/capacitor-build.yml
name: Capacitor Build
on:
  push:
    branches: [main]
jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:ios
      - name: Build iOS App
        run: |
          cd ios
          xcodebuild -workspace App.xcworkspace -scheme App -configuration Release

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:android
      - name: Build Android App
        run: |
          cd android
          ./gradlew assembleRelease
```

## Migration Timeline

| Week | Phase          | Tasks                                                        |
| ---- | -------------- | ------------------------------------------------------------ |
| 1    | Setup          | Install Capacitor, configure platforms, update build process |
| 2    | Implementation | Create native camera hook, build NativeCameraModal component |
| 3    | Enhancement    | Add conditional loading, implement permissions               |
| 4    | Features       | Integrate advanced camera features, native processing        |
| 5    | Deployment     | Setup build pipeline, testing, app store preparation         |

## Testing Strategy

### 1. Device Testing Matrix

- **iOS**: iPhone 12+, iPad (iOS 15+)
- **Android**: Pixel 6+, Samsung Galaxy S21+ (Android 12+)
- **Web**: Chrome, Safari, Firefox (fallback mode)

### 2. Test Cases

- Camera permission flows
- Photo capture quality
- Multi-photo batch upload
- Offline functionality
- Platform-specific features
- Fallback to web implementation

## Rollback Strategy

1. **Feature Flag**: Implement feature toggle for gradual rollout
2. **Dual Implementation**: Keep both implementations during transition
3. **Web Fallback**: Automatic fallback for unsupported platforms
4. **Version Control**: Tag releases for quick rollback

## Benefits of Migration

### Immediate Benefits

- Native camera UI/UX
- Hardware acceleration
- Better image quality
- Faster capture speed
- Access to device gallery

### Future Capabilities

- Video recording
- Barcode/QR scanning
- Document scanning with edge detection
- AR overlays for measurements
- Machine learning on-device processing

## Risks & Mitigation

| Risk                      | Mitigation                         |
| ------------------------- | ---------------------------------- |
| App store approval delays | Start submission process early     |
| Increased app size        | Code splitting, lazy loading       |
| Platform-specific bugs    | Extensive device testing           |
| Learning curve            | Team training, documentation       |
| Maintenance overhead      | Shared codebase, abstraction layer |

## Cost Implications

### Development

- 5 weeks development time
- Testing on physical devices
- App store accounts ($99/year iOS, $25 one-time Android)

### Ongoing

- App store maintenance
- Native SDK updates
- Additional testing for app releases

## Conclusion

Migrating to Capacitor will provide significant improvements to the camera functionality while maintaining the existing web fallback. The phased approach ensures minimal disruption to the current user base while progressively enhancing the experience for mobile users.

## Next Steps

1. **Approval**: Get stakeholder approval for migration
2. **Environment Setup**: Configure development environment for native builds
3. **Prototype**: Build proof-of-concept with basic camera functionality
4. **Team Training**: Ensure team is familiar with Capacitor workflow
5. **Begin Phase 1**: Start with Capacitor installation and configuration
