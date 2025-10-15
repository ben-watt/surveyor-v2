import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface LocalComponentNamePromptProps {
  onCreate: (name: string) => void;
}

/**
 * Renders a simple prompt to create a new local component by name.
 */
export default function LocalComponentNamePrompt({ onCreate }: LocalComponentNamePromptProps) {
  const [name, setName] = useState('');
  const canCreate = name.trim().length > 0;
  return (
    <div className="space-y-4 p-2">
      <div>
        <label className="mb-2 block text-sm font-medium">Component Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter component name"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="default"
          onClick={() => onCreate(name.trim())}
          disabled={!canCreate}
        >
          Create
        </Button>
      </div>
    </div>
  );
}


