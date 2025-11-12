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
  type: 'variable' | 'helper' | 'loop' | 'page-counter';
  description?: string;
}

/**
 * Page counter suggestions for paged.js pagination
 */
const PAGE_COUNTER_SUGGESTIONS: AutocompleteSuggestion[] = [
  {
    label: 'Current Page Number',
    content: 'pageNumber',
    type: 'page-counter',
    description: 'Displays the current page number (e.g., 3)',
  },
  {
    label: 'Total Pages',
    content: 'totalPages',
    type: 'page-counter',
    description: 'Displays total number of pages (e.g., 15)',
  },
];

/**
 * Most commonly used reportDetails variables for initial suggestions
 */
const COMMON_REPORT_DETAILS_PATHS = [
  'reportDetails.clientName',
  'reportDetails.address.formatted',
  'reportDetails.reportDate',
  'reportDetails.reference',
  'reportDetails.level',
  'reportDetails.inspectionDate',
];

/**
 * Generate autocomplete suggestions with helper and loop recommendations
 */
function generateAutocompleteSuggestions(query: string): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Handle empty query: show featured suggestions
  if (!query) {
    // Always show page counters first
    suggestions.push(...PAGE_COUNTER_SUGGESTIONS);

    // Get top variables and prioritize reportDetails.* paths
    const topVars = fuzzySearchVariables('', 10);
    const reportDetailsVars = topVars.filter(v => 
      COMMON_REPORT_DETAILS_PATHS.includes(v.path)
    );
    const otherVars = topVars.filter(v => 
      !COMMON_REPORT_DETAILS_PATHS.includes(v.path)
    );

    // Add reportDetails variables first (up to 6), then others (up to 2)
    const reportDetailsToAdd = reportDetailsVars.slice(0, 6);
    const otherToAdd = otherVars.slice(0, 2);
    const allVarsToAdd = [...reportDetailsToAdd, ...otherToAdd].slice(0, 8);

    for (const variable of allVarsToAdd) {
      suggestions.push({
        label: variable.label,
        path: variable.path,
        content: variable.path,
        type: 'variable',
        description: variable.description,
      });
    }

    return suggestions;
  }

  // Handle non-empty query: filter and match
  const lowerQuery = query.toLowerCase();

  // Add page counter suggestions first (if they match the query)
  for (const pageCounter of PAGE_COUNTER_SUGGESTIONS) {
    if (
      pageCounter.content.toLowerCase().includes(lowerQuery) ||
      pageCounter.label.toLowerCase().includes(lowerQuery) ||
      'page'.includes(lowerQuery)
    ) {
      suggestions.push(pageCounter);
    }
  }
  
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
    // Shared closure variables
    let currentQuery = '';
    let popupRef: TippyInstance[] | null = null;

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

          // Close the popup after selection
          if (popupRef && popupRef[0]) {
            popupRef[0].hide();
          }
        },

        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes.paragraph;
          const allow = !!$from.parent.type.spec.content?.includes('inline');

          return allow;
        },

        items: ({ query }) => {
          // Store query in shared closure
          currentQuery = query || '';
          return generateAutocompleteSuggestions(query);
        },

        render: () => {
          let component: ReactRenderer;
          let popup: TippyInstance[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(VariableAutocomplete, {
                props: {
                  ...props,
                  query: currentQuery,
                },
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

              // Store popup reference in shared closure
              popupRef = popup;
            },

            onUpdate(props: any) {
              component.updateProps({
                ...props,
                query: currentQuery,
              });

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
              if (popup && popup[0]) {
                popup[0].destroy();
              }
              component.destroy();
              popupRef = null;
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

