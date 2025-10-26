import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { VariableAutocomplete } from '@/app/home/configuration/templates/components/VariableAutocomplete';
import { 
  fuzzySearchVariables, 
  type SchemaVariable,
  getLeafVariables,
  type VariableType
} from '@/app/home/surveys/templates/schemaParser';

export interface AutocompleteSuggestion {
  label: string;
  path?: string;
  content: string;
  type: 'variable' | 'helper' | 'loop';
  description?: string;
}

/**
 * Generate autocomplete suggestions with helper and loop recommendations
 */
function generateAutocompleteSuggestions(query: string): AutocompleteSuggestion[] {
  if (!query) {
    return [];
  }

  const suggestions: AutocompleteSuggestion[] = [];
  
  // Find matching variables
  const matchedVars = fuzzySearchVariables(query, 5);
  
  for (const variable of matchedVars) {
    // Add the base variable
    suggestions.push({
      label: variable.label,
      path: variable.path,
      content: variable.path,
      type: 'variable',
      description: variable.description,
    });

    // Add helper suggestions based on type
    if (variable.helperHints && variable.helperHints.length > 0) {
      for (const helper of variable.helperHints) {
        const helperContent = getHelperContent(variable.path, helper, variable.type);
        suggestions.push({
          label: `${variable.label} (${helper})`,
          path: variable.path,
          content: helperContent,
          type: 'helper',
          description: `Use ${helper} helper`,
        });
      }
    }

    // Add loop suggestion for arrays
    if (variable.type === 'array') {
      suggestions.push({
        label: `Loop through ${variable.label}`,
        path: variable.path,
        content: `#each ${variable.path}}\n  \n{{/each}}`,
        type: 'loop',
        description: 'Iterate over array',
      });
    }
  }

  return suggestions;
}

/**
 * Generate helper content based on helper type and variable type
 */
function getHelperContent(path: string, helper: string, type: VariableType): string {
  const helpers: Record<string, Record<VariableType, string>> = {
    formatDate: {
      date: `${path} "DD/MM/YYYY"}}`,
      string: `${path}}`,
      number: `${path}}`,
      boolean: `${path}}`,
      array: `${path}}`,
      object: `${path}}`,
      image: `${path}}`,
    },
    formatCurrency: {
      date: `${path}}`,
      string: `${path}}`,
      number: `${path}}`,
      boolean: `${path}}`,
      array: `${path}}`,
      object: `${path}}`,
      image: `${path}}`,
    },
    uppercase: {
      date: `${path}}`,
      string: `${path}}`,
      number: `${path}}`,
      boolean: `${path}}`,
      array: `${path}}`,
      object: `${path}}`,
      image: `${path}}`,
    },
    lowercase: {
      date: `${path}}`,
      string: `${path}}`,
      number: `${path}}`,
      boolean: `${path}}`,
      array: `${path}}`,
      object: `${path}}`,
      image: `${path}}`,
    },
    levelLabel: {
      date: `${path}}`,
      string: `${path}}`,
      number: `${path}}`,
      boolean: `${path}}`,
      array: `${path}}`,
      object: `${path}}`,
      image: `${path}}`,
    },
  };

  return helpers[helper]?.[type] || `${path}}`;
}

export interface HandlebarsAutocompleteOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

export const HandlebarsAutocomplete = Extension.create<HandlebarsAutocompleteOptions>({
  name: 'handlebarsAutocomplete',

  addOptions() {
    return {
      suggestion: {
        char: '{{',
        pluginKey: new PluginKey('handlebarsAutocomplete'),
        
        command: ({ editor, range, props }) => {
          const suggestion = props as AutocompleteSuggestion;
          const content = `{{${suggestion.content}}}`;
          
          // Delete the trigger and query text, insert the selected content
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(content)
            .run();
        },

        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes.paragraph;
          const allow = !!$from.parent.type.spec.content?.includes('inline');

          return allow;
        },

        items: ({ query }) => {
          return generateAutocompleteSuggestions(query);
        },

        render: () => {
          let component: ReactRenderer;
          let popup: TippyInstance[];

          return {
            onStart: props => {
              component = new ReactRenderer(VariableAutocomplete, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                maxWidth: '400px',
              });
            },

            onUpdate(props) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }

              // Check if component.ref exists and has onKeyDown method
              const ref = component?.ref as { onKeyDown?: (event: KeyboardEvent) => boolean };
              return ref?.onKeyDown?.(props.event) || false;
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

