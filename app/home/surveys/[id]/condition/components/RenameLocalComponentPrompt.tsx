import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface RenameLocalComponentPromptProps {
  initialName: string;
  onRename: (name: string) => void;
}

/**
 * Renders a prompt for renaming a local component.
 */
export default function RenameLocalComponentPrompt({
  initialName,
  onRename,
}: RenameLocalComponentPromptProps) {
  const [name, setName] = useState(initialName || '');
  const canSave = name.trim().length > 0 && name.trim() !== initialName;
  return (
    <div className="space-y-4 p-2">
      <div>
        <label className="mb-2 block text-sm font-medium">Rename Local Component</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter new component name"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="default"
          onClick={() => onRename(name.trim())}
          disabled={!canSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}


