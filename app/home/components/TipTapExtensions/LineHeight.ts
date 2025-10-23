import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

type LineHeightOptions = {
  types: string[];
  defaultLineHeight: string;
  getStyle: (lineHeight: string) => string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      /**
       * Set the line height attribute
       */
      setLineHeight: (lineHeight: string) => ReturnType;
      /**
       * Unset the line height attribute
       */
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions(): LineHeightOptions {
    return {
      types: ['paragraph', 'heading'],
      defaultLineHeight: '1.15',
      getStyle: (lineHeight: string) => {
        return `line-height: ${lineHeight}`;
      },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) => element.style.lineHeight || this.options.defaultLineHeight,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {
                  style: this.options.getStyle(this.options.defaultLineHeight),
                };
              }

              return {
                style: this.options.getStyle(attributes.lineHeight),
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ chain, state }) => {
          const { selection } = state;
          const { from, to } = selection;
          
          return chain()
            .command(({ tr, dispatch }) => {
              tr.doc.nodesBetween(from, to, (node, pos) => {
                if (this.options.types.includes(node.type.name)) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    lineHeight: lineHeight,
                  });
                }
              });
              
              if (dispatch) {
                dispatch(tr);
              }
              return true;
            })
            .run();
        },
      unsetLineHeight:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const { from, to } = selection;
          
          return chain()
            .command(({ tr, dispatch }) => {
              tr.doc.nodesBetween(from, to, (node, pos) => {
                if (this.options.types.includes(node.type.name)) {
                  const { lineHeight, ...attrs } = node.attrs;
                  tr.setNodeMarkup(pos, undefined, attrs);
                }
              });
              
              if (dispatch) {
                dispatch(tr);
              }
              return true;
            })
            .run();
        },
    };
  },
});
