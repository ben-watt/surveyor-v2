import { Editor } from '@tiptap/core';
import { LineHeight } from '../LineHeight';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import History from '@tiptap/extension-history';
import Bold from '@tiptap/extension-bold';

describe('LineHeight Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Heading, LineHeight, History, Bold],
      content: '<p>Test paragraph</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Extension Configuration', () => {
    it('should be registered with correct name', () => {
      expect(editor.extensionManager.extensions.find((ext) => ext.name === 'lineHeight')).toBeDefined();
    });

    it('should have default line height of 1.15', () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === 'lineHeight');
      expect(extension?.options.defaultLineHeight).toBe('1.15');
    });

    it('should support paragraph and heading types', () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === 'lineHeight');
      expect(extension?.options.types).toEqual(['paragraph', 'heading']);
    });
  });

  describe('setLineHeight Command', () => {
    it('should set line height on paragraph', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');
    });

    it('should set line height on heading', () => {
      editor.commands.setContent('<h1>Test heading</h1>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('2.0');

      const heading = editor.state.doc.firstChild;
      expect(heading?.attrs.lineHeight).toBe('2.0');
    });

    it('should update line height when changed', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');
      
      let paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');

      editor.commands.setLineHeight('2.0');
      paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('2.0');
    });

    it('should set different line heights on multiple paragraphs', () => {
      editor.commands.setContent('<p>First paragraph</p><p>Second paragraph</p>');
      
      // Set line height on first paragraph
      editor.commands.setTextSelection({ from: 1, to: 10 });
      editor.commands.setLineHeight('1.5');

      // Set different line height on second paragraph
      editor.commands.setTextSelection({ from: 20, to: 30 });
      editor.commands.setLineHeight('2.0');

      const firstParagraph = editor.state.doc.firstChild;
      const secondParagraph = editor.state.doc.lastChild;

      expect(firstParagraph?.attrs.lineHeight).toBe('1.5');
      expect(secondParagraph?.attrs.lineHeight).toBe('2.0');
    });

    it('should handle selection spanning multiple nodes', () => {
      editor.commands.setContent('<p>First paragraph</p><p>Second paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      editor.state.doc.forEach((node) => {
        if (node.type.name === 'paragraph') {
          expect(node.attrs.lineHeight).toBe('1.5');
        }
      });
    });
  });

  describe('unsetLineHeight Command', () => {
    it('should reset line height to default', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      let paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');

      editor.commands.unsetLineHeight();
      paragraph = editor.state.doc.firstChild;
      // After unsetting, it should return to default
      expect(paragraph?.attrs.lineHeight).toBe('1.15');
    });

    it('should maintain default line height', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.unsetLineHeight();

      const paragraph = editor.state.doc.firstChild;
      // Should have the default line height
      expect(paragraph?.attrs.lineHeight).toBe('1.15');
    });
  });

  describe('HTML Rendering', () => {
    it('should render line height as inline style', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      const html = editor.getHTML();
      expect(html).toContain('line-height: 1.5');
    });

    it('should render default line height when not set', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      const html = editor.getHTML();
      expect(html).toContain('line-height: 1.15');
    });

    it('should render different line heights correctly', () => {
      const testValues = ['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'];

      testValues.forEach((value) => {
        editor.commands.setContent('<p>Test paragraph</p>');
        editor.commands.selectAll();
        editor.commands.setLineHeight(value);

        const html = editor.getHTML();
        expect(html).toContain(`line-height: ${value}`);
      });
    });
  });

  describe('HTML Parsing', () => {
    it('should parse line height from HTML', () => {
      editor.commands.setContent('<p style="line-height: 2.0">Test paragraph</p>');
      
      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('2.0');
    });

    it('should use default line height when not in HTML', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      
      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.15');
    });

    it('should handle mixed line heights in document', () => {
      editor.commands.setContent(`
        <p style="line-height: 1.5">First paragraph</p>
        <p style="line-height: 2.0">Second paragraph</p>
        <h1 style="line-height: 1.0">Heading</h1>
      `);

      const nodes: any[] = [];
      editor.state.doc.forEach((node) => {
        if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          nodes.push(node);
        }
      });

      expect(nodes[0]?.attrs.lineHeight).toBe('1.5');
      expect(nodes[1]?.attrs.lineHeight).toBe('2.0');
      expect(nodes[2]?.attrs.lineHeight).toBe('1.0');
    });
  });

  describe('Integration with Editor', () => {
    it('should maintain line height after undo/redo', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      let paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');

      editor.commands.undo();
      paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.15'); // default

      editor.commands.redo();
      paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');
    });

    it('should work with text formatting', () => {
      editor.commands.setContent('<p>Bold text</p>');
      editor.commands.selectAll();
      editor.commands.toggleBold();
      editor.commands.setLineHeight('2.0');

      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('2.0');
      
      const html = editor.getHTML();
      expect(html).toContain('line-height: 2.0');
      expect(html).toContain('<strong>');
    });

    it('should persist through content updates', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      // Insert text
      editor.commands.setTextSelection({ from: 2, to: 2 });
      editor.commands.insertContent('New ');

      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      editor.commands.setContent('');
      expect(() => {
        editor.commands.setLineHeight('1.5');
      }).not.toThrow();
    });

    it('should handle empty selection', () => {
      editor.commands.setContent('<p>Test paragraph</p>');
      editor.commands.setTextSelection({ from: 0, to: 0 });
      editor.commands.setLineHeight('1.5');

      // Should still apply to the current node
      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');
    });

    it('should handle non-paragraph/heading nodes', () => {
      // Extension should only affect paragraph and heading types
      editor.commands.setContent('<p>Paragraph</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      // Text nodes should not have lineHeight
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'text') {
          expect(node.attrs.lineHeight).toBeUndefined();
        }
      });
    });
  });
});

