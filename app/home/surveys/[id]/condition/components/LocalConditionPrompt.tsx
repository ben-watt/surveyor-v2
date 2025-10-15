import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface LocalConditionPromptProps {
  onCreate: (name: string, text: string) => void;
}

/**
 * Renders a simple prompt to create a new local condition.
 */
export default function LocalConditionPrompt({ onCreate }: LocalConditionPromptProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const canCreate = name.trim().length > 0 && text.trim().length > 0;
  return (
    <div className="space-y-4 p-2">
      <div>
        <label className="mb-2 block text-sm font-medium">Condition Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Deteriorated mortar"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Condition Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the condition"
          rows={5}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="default"
          onClick={() => onCreate(name.trim(), text.trim())}
          disabled={!canCreate}
        >
          Create & Add
        </Button>
      </div>
    </div>
  );
}


