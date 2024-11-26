import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

type FontSizeOptions = {
  types: string[];
  defaultSize: string;
  getStyle: (fontSize: string) => string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size attribute
       */
      setFontSize: (size: string) => ReturnType;
      /**
       * Unset the font size attribute
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions(): FontSizeOptions {
    return {
      types: ['textStyle'],
      defaultSize: '20pt',
      getStyle: (fontSize: string) => {
        return `font-size: ${fontSize}`
      }
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: this.options.defaultSize,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              console.log("[FontSize]", "renderHTML", attributes);
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: this.options.getStyle(attributes.fontSize)
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});