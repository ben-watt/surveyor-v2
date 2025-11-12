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
 * Using Set for O(1) lookup performance
 */
const COMMON_REPORT_DETAILS_PATHS = new Set([
  'reportDetails.clientName',
  'reportDetails.address.formatted',
  'reportDetails.reportDate',
  'reportDetails.reference',
  'reportDetails.level',
  'reportDetails.inspectionDate',
]);

/**
 * Configuration constants for suggestion limits
 */
const MAX_FEATURED_REPORT_DETAILS_VARS = 6;
const MAX_FEATURED_OTHER_VARS = 2;
const MAX_FEATURED_TOTAL = 8;
const MAX_FILTERED_VARS = 5;
const MAX_TOP_VARS = 10;
const POPUP_MAX_WIDTH = '400px';

/**
 * Check if a page counter matches the query
 */
function matchesPageCounter(pageCounter: AutocompleteSuggestion, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    pageCounter.content.toLowerCase().includes(lowerQuery) ||
    pageCounter.label.toLowerCase().includes(lowerQuery) ||
    'page'.includes(lowerQuery)
  );
}

/**
 * Convert a SchemaVariable to an AutocompleteSuggestion
 */
function variableToSuggestion(variable: SchemaVariable): AutocompleteSuggestion {
  return {
    label: variable.label,
    path: variable.path,
    content: variable.path,
    type: 'variable',
    description: variable.description,
  };
}

/**
 * Generate suggestions from variables (base + helpers + loops)
 */
function generateVariableSuggestions(variables: SchemaVariable[]): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  for (const variable of variables) {
    // Add the base variable
    suggestions.push(variableToSuggestion(variable));

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
        content: `{{#each ${variable.path}}}\n  \n{{/each}}`,
        type: 'loop',
        description: 'Iterate over array',
      });
    }
  }

  return suggestions;
}

/**
 * Get featured variables for empty query (prioritizes reportDetails.*)
 */
function getFeaturedVariables(): SchemaVariable[] {
  const topVars = fuzzySearchVariables('', MAX_TOP_VARS);
  const reportDetailsVars = topVars.filter(v => 
    COMMON_REPORT_DETAILS_PATHS.has(v.path)
  );
  const otherVars = topVars.filter(v => 
    !COMMON_REPORT_DETAILS_PATHS.has(v.path)
  );

  // Add reportDetails variables first, then others
  const reportDetailsToAdd = reportDetailsVars.slice(0, MAX_FEATURED_REPORT_DETAILS_VARS);
  const otherToAdd = otherVars.slice(0, MAX_FEATURED_OTHER_VARS);
  return [...reportDetailsToAdd, ...otherToAdd].slice(0, MAX_FEATURED_TOTAL);
}

/**
 * Generate autocomplete suggestions with helper and loop recommendations
 */
function generateAutocompleteSuggestions(query: string): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  // Handle empty query: show featured suggestions
  if (!query) {
    // Always show page counters first
    suggestions.push(...PAGE_COUNTER_SUGGESTIONS);

    // Add featured variables
    const featuredVars = getFeaturedVariables();
    suggestions.push(...generateVariableSuggestions(featuredVars));

    return suggestions;
  }

  // Handle non-empty query: filter and match
  // Add page counter suggestions first (if they match the query)
  for (const pageCounter of PAGE_COUNTER_SUGGESTIONS) {
    if (matchesPageCounter(pageCounter, query)) {
      suggestions.push(pageCounter);
    }
  }
  
  // Find matching variables and generate suggestions
  const matchedVars = fuzzySearchVariables(query, MAX_FILTERED_VARS);
  suggestions.push(...generateVariableSuggestions(matchedVars));

  return suggestions;
}

/**
 * Default helper content for most helpers (same for all types)
 */
const DEFAULT_HELPER_CONTENT = (path: string): Record<VariableType, string> => ({
  date: `${path}}`,
  string: `${path}}`,
  number: `${path}}`,
  boolean: `${path}}`,
  array: `${path}}`,
  object: `${path}}`,
  image: `${path}}`,
});

/**
 * Generate helper content based on helper type and variable type
 */
function getHelperContent(path: string, helper: string, type: VariableType): string {
  // Special case: formatDate has custom format for date type
  if (helper === 'formatDate' && type === 'date') {
    return `${path} "DD/MM/YYYY"}}`;
  }

  // All other helpers use the default content
  const defaultContent = DEFAULT_HELPER_CONTENT(path);
  return defaultContent[type] || `${path}}`;
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
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] | null = null;

          const createPopup = (clientRect: () => DOMRect, componentElement: HTMLElement) => {
            return tippy('body', {
              getReferenceClientRect: clientRect,
              appendTo: () => document.body,
              content: componentElement,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              maxWidth: POPUP_MAX_WIDTH,
            });
          };

          const closePopup = () => {
            if (popup && popup[0]) {
              popup[0].hide();
            }
          };

          const destroyPopup = () => {
            if (popup && popup[0]) {
              popup[0].destroy();
            }
            popup = null;
            popupRef = null;
          };

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(VariableAutocomplete, {
                props: {
                  ...props,
                  query: currentQuery,
                },
                editor: props.editor,
              });

              if (!props.clientRect || !component) {
                return;
              }

              popup = createPopup(props.clientRect, component.element as HTMLElement);
              popupRef = popup;
            },

            onUpdate: (props: any) => {
              if (!component) {
                return;
              }

              component.updateProps({
                ...props,
                query: currentQuery,
              });

              if (!props.clientRect || !popup) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                closePopup();
                return true;
              }

              // Check if component.ref exists and has onKeyDown method
              if (!component) {
                return false;
              }

              const ref = component.ref as { onKeyDown?: (event: KeyboardEvent) => boolean };
              return ref?.onKeyDown?.(props.event) || false;
            },

            onExit: () => {
              destroyPopup();
              if (component) {
                component.destroy();
                component = null;
              }
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

