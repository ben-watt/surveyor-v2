'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { canUseNativeCamera } from '@/app/utils/capacitor/platform';
import { Loader2 } from 'lucide-react';

// Dynamically import components to avoid SSR issues
const NativeCameraModal = dynamic(
  () => import('./NativeCameraModal').then(mod => ({ default: mod.NativeCameraModal })),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999999]">
        <div className="text-white flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading camera...</span>
        </div>
      </div>
    )
  }
);

const WebCameraModal = dynamic(
  () => import('./CameraModal').then(mod => ({ default: mod.CameraModal })),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999999]">
        <div className="text-white flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading camera...</span>
        </div>
      </div>
    )
  }
);

interface CameraModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  path: string;
  onPhotoCaptured?: (filePath: string) => void;
  maxPhotos?: number;
  forceWeb?: boolean; // Force web camera for testing/fallback
}

export const CameraModalWrapper = ({ 
  isOpen, 
  onClose, 
  path, 
  onPhotoCaptured,
  maxPhotos = 10,
  forceWeb = false
}: CameraModalWrapperProps) => {
  const [useNative, setUseNative] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Determine which camera implementation to use
    const initializeCameraType = async () => {
      if (forceWeb) {
        setUseNative(false);
      } else {
        const canUseNative = canUseNativeCamera();
        setUseNative(canUseNative);
      }
      setIsInitialized(true);
    };

    if (isOpen && !isInitialized) {
      initializeCameraType();
    }
  }, [isOpen, forceWeb, isInitialized]);

  // Reset initialization when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      setUseNative(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Show loading while determining which camera to use
  if (!isInitialized || useNative === null) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999999]">
        <div className="text-white flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span>Initializing camera...</span>
        </div>
      </div>
    );
  }

  // Use native camera on mobile platforms
  if (useNative) {
    return (
      <NativeCameraModal
        isOpen={isOpen}
        onClose={onClose}
        path={path}
        onPhotoCaptured={onPhotoCaptured}
        maxPhotos={maxPhotos}
      />
    );
  }

  // Fallback to web camera
  return (
    <WebCameraModal
      isOpen={isOpen}
      onClose={onClose}
      path={path}
      onPhotoCaptured={onPhotoCaptured}
      maxPhotos={maxPhotos}
    />
  );
};