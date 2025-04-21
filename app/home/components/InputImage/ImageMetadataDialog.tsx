import { FileWithPath } from "react-dropzone";
import { imageUploadStore } from "@/app/home/clients/ImageUploadStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/app/home/components/Input/Label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { useState } from "react";

interface ImageMetadata {
  caption?: string;
  notes?: string;
  [key: string]: string | undefined;
}

interface ImageMetadataDialogProps {
  file: FileWithPath | null;
  path: string;
  onClose: () => void;
}

export const ImageMetadataDialog = ({ file, path, onClose }: ImageMetadataDialogProps) => {
  const [metadata, setMetadata] = useState<ImageMetadata>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load existing metadata when dialog opens
  useEffect(() => {
    const loadMetadata = async () => {
      if (!file) return;

      try {
        const filePath = `${path}/${file.name}`;
        const result = await imageUploadStore.get(filePath);
        if (result.ok) {
          setMetadata(result.val.metadata || {});
        }
      } catch (error) {
        console.error("Error loading file metadata:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, [file, path]);

  const handleSave = async () => {
    if (!file) return;

    const filePath = `${path}/${file.name}`;
    try {
      // Filter out undefined values and convert to Record<string, string>
      const metadataToSave = Object.entries(metadata).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      await imageUploadStore.updateMetadata(filePath, metadataToSave);
      onClose();
    } catch (error) {
      console.error("Error updating metadata:", error);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={!!file} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image Metadata</DialogTitle>
          </DialogHeader>
          <div className="py-4">Loading metadata...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Image Metadata</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label text="Caption" />
            <Input
              placeholder="Enter image caption"
              value={metadata.caption || ""}
              onChange={(e) =>
                setMetadata((prev) => ({ ...prev, caption: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label text="Notes" />
            <Textarea
              placeholder="Enter any additional notes"
              value={metadata.notes || ""}
              onChange={(e) =>
                setMetadata((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Metadata</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 