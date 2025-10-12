import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useImageUploadStatus } from '@/app/home/components/InputImage/useImageUploadStatus';

interface SaveButtonWithUploadStatusProps {
  isSubmitting: boolean;
  paths: string[];
  buttonText?: string;
  loadingText?: string;
}

const SaveButtonWithUploadStatus = memo(
  ({
    isSubmitting,
    paths,
    buttonText = 'Save',
    loadingText = 'Images Uploading...',
  }: SaveButtonWithUploadStatusProps) => {
    // Use the hook to track upload status
    const { isUploading } = useImageUploadStatus(paths);

    return (
      <>
        {isUploading && (
          <Alert variant="default" className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700">
              Images are currently uploading. Please wait until all uploads complete before saving.
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="default"
          className="w-full"
          type="submit"
          disabled={isSubmitting || isUploading}
        >
          {isUploading ? loadingText : buttonText}
        </Button>
      </>
    );
  },
);

SaveButtonWithUploadStatus.displayName = 'SaveButtonWithUploadStatus';

export default SaveButtonWithUploadStatus;
