import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * HandlebarsHighlight Extension
 *
 * Provides syntax highlighting for Handlebars template syntax:
 * - Regular variables: {{variable}} - cyan/blue
 * - Page counters: {{pageNumber}}, {{totalPages}} - purple
 * - Loop constructs: {{#each}}, {{#if}}, {{#unless}} - orange
 * - Closing tags: {{/each}}, {{/if}} - gray
 * - Helper calls: {{{helper}}} - green
 */

export const HandlebarsHighlight = Extension.create({
  name: 'handlebarsHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('handlebarsHighlight'),
        
        state: {
          init(_, { doc }) {
            return findHandlebarsDecorations(doc);
          },
          apply(transaction, oldState) {
            return transaction.docChanged
              ? findHandlebarsDecorations(transaction.doc)
              : oldState;
          },
        },
        
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function findHandlebarsDecorations(doc: any): DecorationSet {
  const decorations: Decoration[] = [];
  
  // Regular expression patterns for different Handlebars syntax
  // Order matters: more specific patterns first
  const patterns = [
    {
      // Loop opening tags: {{#each}}, {{#if}}, {{#unless}}, {{#with}}
      regex: /\{\{#(each|if|unless|with|and|or)\b[^}]*\}\}/g,
      className: 'handlebars-loop',
    },
    {
      // Closing tags: {{/each}}, {{/if}}, {{/unless}}, {{/with}}
      regex: /\{\{\/(each|if|unless|with|and|or)\}\}/g,
      className: 'handlebars-close',
    },
    {
      // Else tags: {{else}}
      regex: /\{\{else\}\}/g,
      className: 'handlebars-else',
    },
    {
      // Triple braces (unescaped): {{{helper}}}
      regex: /\{\{\{[^}]+\}\}\}/g,
      className: 'handlebars-unescaped',
    },
    {
      // Page counters: {{pageNumber}}, {{totalPages}}
      regex: /\{\{(pageNumber|totalPages)\}\}/g,
      className: 'handlebars-page-counter',
    },
    {
      // Regular variables: {{variable}}, {{this.property}}, {{../parent}}
      regex: /\{\{[^#/!{][^}]*\}\}/g,
      className: 'handlebars-variable',
    },
    {
      // Comments: {{! comment}} or {{!-- comment --}}
      regex: /\{\{!--?[^}]*--?\}\}/g,
      className: 'handlebars-comment',
    },
  ];

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) {
      return;
    }

    const text = node.text || '';
    
    // Apply each pattern
    patterns.forEach(({ regex, className }) => {
      let match;
      const localRegex = new RegExp(regex.source, regex.flags);
      
      while ((match = localRegex.exec(text)) !== null) {
        const from = pos + match.index;
        const to = from + match[0].length;
        
        decorations.push(
          Decoration.inline(from, to, {
            class: className,
          })
        );
      }
    });
  });

  return DecorationSet.create(doc, decorations);
}

