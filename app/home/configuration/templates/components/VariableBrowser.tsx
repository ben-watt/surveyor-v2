'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Search, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  parseSchema,
  searchVariables,
  type SchemaVariable,
  type VariableType,
} from '@/app/home/surveys/templates/schemaParser';
import toast from 'react-hot-toast';

interface VariableBrowserProps {
  onInsert: (variablePath: string) => void;
  className?: string;
}

const TYPE_COLORS: Record<VariableType, string> = {
  string: 'bg-blue-100 text-blue-800',
  number: 'bg-green-100 text-green-800',
  boolean: 'bg-purple-100 text-purple-800',
  date: 'bg-red-100 text-red-800',
  array: 'bg-orange-100 text-orange-800',
  object: 'bg-gray-100 text-gray-800',
  image: 'bg-pink-100 text-pink-800',
};

function VariableNode({
  variable,
  onInsert,
  searchQuery,
  level = 0,
}: {
  variable: SchemaVariable;
  onInsert: (path: string) => void;
  searchQuery: string;
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(level < 2 || searchQuery.length > 0);
  const hasChildren = variable.children && variable.children.length > 0;
  const isLeaf = !hasChildren;

  const handleClick = () => {
    if (isLeaf) {
      onInsert(variable.path);
      toast.success(`Inserted: {{${variable.path}}}`);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`{{${variable.path}}}`);
    toast.success('Copied to clipboard');
  };

  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="text-sm">
      {hasChildren ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer group"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
              {isOpen ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              <span className="font-medium text-gray-700 flex-1">
                {highlightMatch(variable.label)}
              </span>
              <Badge className={`text-xs ${TYPE_COLORS[variable.type]}`}>
                {variable.type}
              </Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {variable.children?.map(child => (
              <VariableNode
                key={child.path}
                variable={child}
                onInsert={onInsert}
                searchQuery={searchQuery}
                level={level + 1}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-blue-50 rounded cursor-pointer group"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={handleClick}
          title={variable.description}
        >
          <div className="w-3 shrink-0" />
          <code className="text-xs text-gray-600 flex-1 font-mono">
            {highlightMatch(variable.label)}
          </code>
          <Badge className={`text-xs ${TYPE_COLORS[variable.type]}`}>
            {variable.type}
          </Badge>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <Copy className="h-3 w-3 text-gray-500" />
          </button>
        </div>
      )}
      {variable.description && isLeaf && (
        <div
          className="text-xs text-gray-500 italic mt-0.5"
          style={{ paddingLeft: `${level * 12 + 20}px` }}
        >
          {variable.description}
        </div>
      )}
      {variable.helperHints && variable.helperHints.length > 0 && (
        <div
          className="text-xs text-blue-600 mt-0.5 flex flex-wrap gap-1"
          style={{ paddingLeft: `${level * 12 + 20}px` }}
        >
          <span className="text-gray-500">Helpers:</span>
          {variable.helperHints.map(hint => (
            <code key={hint} className="bg-blue-50 px-1 rounded">
              {hint}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function VariableBrowser({ onInsert, className = '' }: VariableBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const schema = useMemo(() => parseSchema(), []);

  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) {
      return schema;
    }
    return searchVariables(searchQuery.trim());
  }, [searchQuery, schema]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="sticky top-0 bg-white border-b pb-3 space-y-2">
        <h3 className="font-semibold text-sm text-gray-900">Available Variables</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search variables..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
          Click any variable to insert it at cursor position
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-1">
        {filteredVariables.length > 0 ? (
          filteredVariables.map(variable => (
            <VariableNode
              key={variable.path}
              variable={variable}
              onInsert={onInsert}
              searchQuery={searchQuery}
            />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            No variables found matching "{searchQuery}"
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t pt-3 mt-3 space-y-2">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="font-semibold">Quick Tips:</div>
          <div>• Use <code className="bg-gray-100 px-1 rounded">{'{{#each}}'}</code> for arrays</div>
          <div>• Use <code className="bg-gray-100 px-1 rounded">{'{{#if}}'}</code> for conditionals</div>
          <div>• Use <code className="bg-gray-100 px-1 rounded">this.</code> inside loops</div>
        </div>
      </div>
    </div>
  );
}

