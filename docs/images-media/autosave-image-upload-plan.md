---
title: "Autosave for Image Upload Forms"
status: partial
category: images-media
created: 2025-10-01
updated: 2025-11-24
tags: [autosave, images, react-hook-form]
related: [./image-upload-architecture.md, ../autosave/autosave-implementation.md]
priority: high
---

# Autosave Implementation Plan for Forms with Image Uploads

## Overview

This document outlines the implementation plan for adding autosave functionality to forms that include image uploads. The solution integrates with the existing autosave system while handling the asynchronous nature of image uploads.

## Current System Analysis

### Image Upload Architecture

- **SurveyImage Type**: `{ path: string, isArchived: boolean, hasMetadata: boolean }`
- **Upload Process**: Images are uploaded asynchronously via `ImageUploadStore` (IndexedDB → AWS S3)
- **Status Tracking**: `imageUploadStatusStore` tracks upload status globally
- **Monitoring**: `useImageUploadStatus` hook monitors upload progress for specific paths
- **Current Form Integration**: `SaveButtonWithUploadStatus` waits for uploads to complete

### The Challenge

Current autosave doesn't handle async image uploads. We need to:

1. Save immediately when image uploads complete
2. Handle partial saves during upload progress
3. Provide appropriate status indicators
4. Maintain form state during uploads

## Solution Architecture

### 1. Enhanced Autosave Hook: `useAutoSaveFormWithImages`

**Purpose**: Extends `useAutoSaveForm` to handle image uploads intelligently.

**Key Features**:

- Tracks image upload status for specified paths
- Triggers autosave when images finish uploading
- Provides combined status (form save + image upload)
- Handles partial saves with upload progress

**API**:

```typescript
interface AutoSaveFormWithImagesOptions extends AutoSaveFormOptions {
  imagePaths: string[];
  saveOnImageUpload?: boolean; // Default: true
}

interface AutoSaveFormWithImagesResult extends AutoSaveResult {
  isUploading: boolean;
  uploadProgress: Record<string, boolean>;
  combinedStatus: 'idle' | 'saving' | 'uploading' | 'saved' | 'error';
}

function useAutoSaveFormWithImages<T>(
  saveFunction: (data: T, options?: { auto?: boolean }) => Promise<void>,
  watch: UseFormWatch<T>,
  getValues: UseFormGetValues<T>,
  options: AutoSaveFormWithImagesOptions,
): AutoSaveFormWithImagesResult;
```

### 2. Enhanced Status Indicator: `LastSavedIndicatorWithUploads`

**Purpose**: Shows both save status and upload progress.

**Status Logic**:

- `uploading`: Images are currently uploading
- `saving`: Form is being saved
- `saved`: Both form saved and images uploaded
- `error`: Save or upload failed

**API**:

```typescript
interface LastSavedIndicatorWithUploadsProps extends LastSavedIndicatorProps {
  isUploading: boolean;
  uploadProgress?: Record<string, boolean>;
}
```

### 3. Image Upload Completion Listener

**Purpose**: Triggers autosave when image uploads complete.

**Implementation**:

- Subscribes to `imageUploadStatusStore` changes
- Monitors specific paths for upload completion
- Triggers autosave when all monitored uploads complete

## Technical Implementation

### Phase 1: Core Hook Implementation

#### 1.1 Create `useAutoSaveFormWithImages` Hook

**File**: `app/home/hooks/useAutoSaveFormWithImages.ts`

```typescript
import { useCallback, useEffect, useState } from 'react';
import { FieldValues, UseFormWatch, UseFormGetValues } from 'react-hook-form';
import { useAutoSaveForm, AutoSaveFormOptions } from './useAutoSaveForm';
import { useImageUploadStatus } from '../components/InputImage/useImageUploadStatus';
import { imageUploadStatusStore } from '../components/InputImage/imageUploadStatusStore';

interface AutoSaveFormWithImagesOptions extends AutoSaveFormOptions {
  imagePaths: string[];
  saveOnImageUpload?: boolean;
}

export function useAutoSaveFormWithImages<T extends FieldValues>(
  saveFunction: (data: T, options?: { auto?: boolean }) => Promise<void>,
  watch: UseFormWatch<T>,
  getValues: UseFormGetValues<T>,
  options: AutoSaveFormWithImagesOptions,
) {
  const { imagePaths, saveOnImageUpload = true, ...autoSaveOptions } = options;
  const { isUploading, isPathUploading } = useImageUploadStatus(imagePaths);
  const [previousUploadState, setPreviousUploadState] = useState<Record<string, boolean>>({});

  const autoSave = useAutoSaveForm(saveFunction, watch, getValues, autoSaveOptions);

  // Track individual upload progress
  const uploadProgress = imagePaths.reduce(
    (acc, path) => {
      acc[path] = isPathUploading(path);
      return acc;
    },
    {} as Record<string, boolean>,
  );

  // Combined status logic
  const combinedStatus = isUploading ? 'uploading' : autoSave.saveStatus;

  // Listen for upload completion and trigger autosave
  useEffect(() => {
    if (!saveOnImageUpload) return;

    const currentUploadState = imagePaths.reduce(
      (acc, path) => {
        acc[path] = isPathUploading(path);
        return acc;
      },
      {} as Record<string, boolean>,
    );

    // Check if any uploads just completed
    const hasCompletedUploads = imagePaths.some((path) => {
      const wasUploading = previousUploadState[path];
      const isCurrentlyUploading = currentUploadState[path];
      return wasUploading && !isCurrentlyUploading;
    });

    if (hasCompletedUploads) {
      console.log('[useAutoSaveFormWithImages] Upload completed, triggering autosave');
      const currentData = getValues();
      autoSave.triggerAutoSave(currentData);
    }

    setPreviousUploadState(currentUploadState);
  }, [imagePaths, isPathUploading, previousUploadState, saveOnImageUpload, getValues, autoSave]);

  return {
    ...autoSave,
    isUploading,
    uploadProgress,
    combinedStatus,
  };
}
```

#### 1.2 Create Enhanced Status Indicator

**File**: `app/home/components/LastSavedIndicatorWithUploads.tsx`

```typescript
import React from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AutoSaveStatus } from '../hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface LastSavedIndicatorWithUploadsProps {
  status: AutoSaveStatus;
  isUploading: boolean;
  lastSavedAt?: Date | null;
  entityUpdatedAt?: string | null;
  uploadProgress?: Record<string, boolean>;
  className?: string;
  showIcon?: boolean;
  showTimestamp?: boolean;
}

export function LastSavedIndicatorWithUploads({
  status,
  isUploading,
  lastSavedAt,
  entityUpdatedAt,
  uploadProgress,
  className,
  showIcon = true,
  showTimestamp = true
}: LastSavedIndicatorWithUploadsProps) {
  const getStatusConfig = () => {
    if (isUploading) {
      return {
        icon: Upload,
        text: 'Uploading images...',
        className: 'text-blue-600'
      };
    }

    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          className: 'text-blue-600'
        };
      case 'saved':
        return {
          icon: CheckCircle,
          text: 'All changes saved',
          className: 'text-green-600'
        };
      case 'autosaved':
        return {
          icon: CheckCircle,
          text: 'Auto-saved',
          className: 'text-green-600'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Save failed',
          className: 'text-red-600'
        };
      default:
        return {
          icon: CheckCircle,
          text: 'Last saved',
          className: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      'flex items-center gap-2 text-sm',
      config.className,
      className
    )}>
      {showIcon && config.icon && (
        <config.icon
          className={cn(
            'h-4 w-4',
            (status === 'saving' || isUploading) && 'animate-spin'
          )}
        />
      )}

      <div className="flex flex-col">
        <span>{config.text}</span>

        {showTimestamp && !isUploading && status !== 'saving' && status !== 'error' && (
          <span className="text-xs opacity-75">
            {/* Same timestamp logic as original LastSavedIndicator */}
          </span>
        )}
      </div>
    </div>
  );
}
```

### Phase 2: Form Conversions

#### 2.1 Convert ReportDetailsForm

**Key Changes**:

- Replace `SaveButtonWithUploadStatus` with autosave
- Add `LastSavedIndicatorWithUploads`
- Configure image paths for monitoring

**Example Implementation**:

```typescript
// In ReportDetailsForm.tsx
const { saveStatus, isSaving, isUploading, lastSavedAt } = useAutoSaveFormWithImages(
  saveData,
  watch,
  getValues,
  {
    delay: 1500,
    enabled: !!surveyId,
    imagePaths: [
      `report-images/${surveyId}/moneyShot/`,
      `report-images/${surveyId}/frontElevationImagesUri/`
    ]
  }
);

// Replace SaveButtonWithUploadStatus with status indicator
<LastSavedIndicatorWithUploads
  status={saveStatus}
  isUploading={isUploading}
  lastSavedAt={lastSavedAt}
  entityUpdatedAt={reportDetails?.updatedAt}
  className="text-sm justify-center"
/>
```

#### 2.2 Convert ElementForm

**Key Changes**:

- Handle dynamic image paths based on element ID
- Integrate with existing component management
- Replace `AddComponentButton` upload check

#### 2.3 Convert InspectionForm

**Key Changes**:

- Handle single image upload path
- Integrate with existing form structure

#### 2.4 Convert BuildingSurveyForm

**Key Changes**:

- Handle multiple sections with different image paths
- Integrate with existing action menu
- Consider per-section autosave approach

### Phase 3: Testing and Validation

#### 3.1 Test Scenarios

1. **Basic Autosave**: Form changes trigger autosave without images
2. **Image Upload Completion**: Images finish uploading, autosave triggers
3. **Concurrent Operations**: User types while images upload
4. **Error Handling**: Upload failures, save failures
5. **Multiple Image Paths**: Forms with multiple image upload areas

#### 3.2 Status Indicator Testing

1. **Upload Progress**: Shows uploading status during image upload
2. **Save Progress**: Shows saving status during form save
3. **Combined Status**: Correctly prioritizes upload vs save status
4. **Timestamp Display**: Shows appropriate last saved time

### Phase 4: Optimization and Polish

#### 4.1 Performance Optimizations

- Debounce image upload listeners
- Optimize status indicator re-renders
- Memory cleanup for upload listeners

#### 4.2 User Experience Enhancements

- Clear visual feedback during uploads
- Appropriate loading states
- Error recovery mechanisms

## Implementation Timeline

### Week 1: Core Infrastructure

- [ ] Create `useAutoSaveFormWithImages` hook
- [ ] Create `LastSavedIndicatorWithUploads` component
- [ ] Test core functionality

### Week 2: Form Conversions

- [ ] Convert ReportDetailsForm
- [ ] Convert ElementForm
- [ ] Convert InspectionForm

### Week 3: Complex Forms and Testing

- [ ] Convert BuildingSurveyForm
- [ ] Comprehensive testing
- [ ] Bug fixes and optimizations

### Week 4: Polish and Documentation

- [ ] Performance optimizations
- [ ] User experience improvements
- [ ] Documentation updates

## Success Criteria

1. **Functional Requirements**:

   - Forms automatically save when images finish uploading
   - Status indicators accurately reflect upload and save progress
   - No data loss during upload/save operations
   - Proper error handling for failed uploads/saves

2. **User Experience**:

   - Clear visual feedback during all operations
   - No unexpected delays or blocking operations
   - Intuitive status messaging
   - Responsive interface during uploads

3. **Technical Requirements**:
   - Clean integration with existing autosave system
   - Proper memory management and cleanup
   - Efficient upload monitoring
   - Maintainable code structure

## Risks and Mitigation

### Risk: Upload Status Race Conditions

**Mitigation**: Implement proper state management and debouncing

### Risk: Performance Impact

**Mitigation**: Optimize listeners and status checks

### Risk: Complex Form State Management

**Mitigation**: Incremental conversion and thorough testing

### Risk: User Confusion with Status Indicators

**Mitigation**: Clear, consistent messaging and visual design

## Next Steps

1. **Review and Approval**: Get stakeholder approval for this approach
2. **Detailed Design**: Create detailed component and hook designs
3. **Prototype**: Build a working prototype with one form
4. **Implementation**: Execute the phased implementation plan
5. **Testing**: Comprehensive testing across all scenarios
6. **Deployment**: Gradual rollout with monitoring

---

This plan provides a comprehensive approach to implementing autosave functionality for forms with image uploads while maintaining the existing system's reliability and user experience.
