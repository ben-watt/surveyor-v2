import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

type FontWeightOptions = {
  types: string[];
  defaultWeight: string;
  getStyle: (fontWeight: string) => string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontWeight: {
      /**
       * Set the font weight attribute
       */
      setFontWeight: (weight: string) => ReturnType;
      /**
       * Unset the font weight attribute
       */
      unsetFontWeight: () => ReturnType;
    };
  }
}

export const FontWeight = Extension.create<FontWeightOptions>({
  name: 'fontWeight',

  addOptions(): FontWeightOptions {
    return {
      types: ['textStyle', 'heading', 'paragraph'],
      defaultWeight: 'normal',
      getStyle: (fontWeight: string) => {
        return `font-weight: ${fontWeight}`;
      },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontWeight: {
            default: this.options.defaultWeight,
            parseHTML: (element) => element.style.fontWeight.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontWeight) {
                return {
                  style: this.options.getStyle(this.options.defaultWeight),
                };
              }

              return {
                style: this.options.getStyle(attributes.fontWeight),
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontWeight:
        (fontWeight) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontWeight }).run();
        },
      unsetFontWeight:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontWeight: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
