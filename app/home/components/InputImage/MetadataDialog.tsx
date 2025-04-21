'use client'

import { useState, useEffect } from 'react';
import { FilePondInitialFile } from 'filepond';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/app/home/components/Input/Label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { initMetadataDialog } from './filePondConfig';
interface MetadataDialogManagerProps {
  onInit?: () => void;
}

interface ImageMetadata {
  title?: string;
  description?: string;
  tags?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export const MetadataDialogManager: React.FC<MetadataDialogManagerProps> = ({ onInit }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<FilePondInitialFile | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata>({});
  const [saveCallback, setSaveCallback] = useState<((metadata: ImageMetadata) => void) | null>(null);

  const handleOpen = (
    file: FilePondInitialFile, 
    currentMetadata: ImageMetadata, 
    save: (metadata: ImageMetadata) => void
  ) => {
    setFile(file);
    setMetadata(currentMetadata || {});
    setSaveCallback(() => save);
    setOpen(true);
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadata((prev: ImageMetadata) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (saveCallback) {
      saveCallback(metadata);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  useEffect(() => {
    // Initialize the metadata dialog manager
    initMetadataDialog({
      open: handleOpen
    });
    
    if (onInit) {
      onInit();
    }
  }, [onInit]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Image Metadata</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label text="Caption" />
            <Input
              placeholder="Enter image caption"
              value={metadata.caption || ''}
              onChange={(e) => handleMetadataChange('caption', e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label text="Notes" />
            <Textarea
              placeholder="Enter any additional notes"
              value={metadata.notes || ''}
              onChange={(e) => handleMetadataChange('notes', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label text="Archive" />
            <Switch 
              checked={metadata.archive === 'true'} 
              onCheckedChange={(checked) => handleMetadataChange('archive', checked.toString())} />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Metadata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MetadataDialogManager; 