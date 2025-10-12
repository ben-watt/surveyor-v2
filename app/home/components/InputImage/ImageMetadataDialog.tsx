import { FileWithPath } from 'react-dropzone';
import { imageMetadataStore, type ImageMetadata } from '@/app/home/clients/Database';
import { Label } from '@/app/home/components/Input/Label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { join } from 'path';

interface ImageMetadataDialogProps {
  file: FileWithPath;
  path: string;
  onClose: () => void;
}

export const ImageMetadataDialog = ({ file, path, onClose }: ImageMetadataDialogProps) => {
  const [metadata, setMetadata] = useState<{ caption?: string; notes?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [metadataId, setMetadataId] = useState<string | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!file) return;

      try {
        const imagePath = join(path, file.name);
        const existingMetadata = await imageMetadataStore.get(imagePath);
        if (existingMetadata) {
          setMetadataId(existingMetadata.id);
          setMetadata({
            caption: existingMetadata.caption || '',
            notes: existingMetadata.notes || '',
          });
        }
      } catch (error) {
        console.error('Error loading file metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, [file, path]);

  const handleSave = async () => {
    if (!file) return;

    const imagePath = join(path, file.name);
    try {
      if (metadataId) {
        // Update existing metadata
        await imageMetadataStore.update(metadataId, (current) => {
          if (current) {
            current.caption = metadata.caption;
            current.notes = metadata.notes;
          }
        });
      } else {
        await imageMetadataStore.add({
          id: imagePath,
          imagePath,
          caption: metadata.caption,
          notes: metadata.notes,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  };

  if (isLoading) {
    return <div>Loading metadata...</div>;
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label text="Caption" />
        <Input
          placeholder="Enter image caption"
          value={metadata.caption || ''}
          onChange={(e) => setMetadata((prev) => ({ ...prev, caption: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label text="Notes" />
        <Textarea
          placeholder="Enter any additional notes"
          value={metadata.notes || ''}
          onChange={(e) => setMetadata((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Metadata</Button>
      </div>
    </div>
  );
};
