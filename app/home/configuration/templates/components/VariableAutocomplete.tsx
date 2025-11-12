import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { AutocompleteSuggestion } from '@/app/home/components/TipTapExtensions/HandlebarsAutocomplete';

interface VariableAutocompleteProps {
  items: AutocompleteSuggestion[];
  command: (item: AutocompleteSuggestion) => void;
  query?: string;
}

const SUGGESTION_TYPE_COLORS: Record<string, string> = {
  variable: 'bg-blue-100 text-blue-800',
  helper: 'bg-green-100 text-green-800',
  loop: 'bg-orange-100 text-orange-800',
  'page-counter': 'bg-purple-100 text-purple-800',
};

export const VariableAutocomplete = forwardRef<
  { onKeyDown: (event: KeyboardEvent) => boolean },
  VariableAutocompleteProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="handlebars-autocomplete">
        <div className="autocomplete-item-empty">No variables found</div>
      </div>
    );
  }

  const isEmptyQuery = !props.query || props.query.trim() === '';

  return (
    <div className="handlebars-autocomplete">
      {props.items.map((item, index) => (
        <button
          key={`${item.type}-${item.label}-${index}`}
          className={`autocomplete-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => selectItem(index)}
          type="button"
        >
          <code className="autocomplete-item-path">{item.label}</code>
          <Badge className={`text-xs ${SUGGESTION_TYPE_COLORS[item.type]}`}>
            {item.type}
          </Badge>
        </button>
      ))}
      {isEmptyQuery && props.items.length > 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
          Type to search more variables...
        </div>
      )}
    </div>
  );
});

VariableAutocomplete.displayName = 'VariableAutocomplete';

