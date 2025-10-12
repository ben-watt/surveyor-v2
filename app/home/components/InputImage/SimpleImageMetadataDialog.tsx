import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface SimpleImageMetadataDialogProps {
  initialCaption?: string;
  initialNotes?: string;
  onSave: (caption: string, notes: string) => void;
  onClose: () => void;
}

export const SimpleImageMetadataDialog = ({
  initialCaption = '',
  initialNotes = '',
  onSave,
  onClose,
}: SimpleImageMetadataDialogProps) => {
  const [caption, setCaption] = useState(initialCaption);
  const [notes, setNotes] = useState(initialNotes);

  const handleSave = () => {
    onSave(caption, notes);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Caption</label>
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Enter image caption..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter additional notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
};
