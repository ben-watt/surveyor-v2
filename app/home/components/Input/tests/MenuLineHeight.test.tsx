/**
 * @jest-environment jsdom
 */
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import { LineHeight } from '../../TipTapExtensions/LineHeight';

/**
 * Integration tests for LineHeight feature in the BlockEditor
 * These tests verify the LineHeight extension commands work correctly
 * and can be used by the MenuLineHeight UI component.
 */
describe('LineHeight Integration with BlockEditor', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Heading, LineHeight],
      content: '<p>Test paragraph</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Command Availability', () => {
    it('should have setLineHeight command available', () => {
      expect(editor.commands.setLineHeight).toBeDefined();
      expect(typeof editor.commands.setLineHeight).toBe('function');
    });

    it('should have unsetLineHeight command available', () => {
      expect(editor.commands.unsetLineHeight).toBeDefined();
      expect(typeof editor.commands.unsetLineHeight).toBe('function');
    });
  });

  describe('Standard Line Height Presets', () => {
    const presets = [
      { value: '1.0', label: 'Single' },
      { value: '1.15', label: '1.15 (default)' },
      { value: '1.5', label: '1.5' },
      { value: '2.0', label: 'Double' },
      { value: '2.5', label: '2.5' },
      { value: '3.0', label: '3.0' },
    ];

    presets.forEach(({ value, label }) => {
      it(`should apply ${label} line height`, () => {
        editor.commands.selectAll();
        editor.commands.setLineHeight(value);

        const paragraph = editor.state.doc.firstChild;
        expect(paragraph?.attrs.lineHeight).toBe(value);
      });
    });
  });

  describe('getAttributes Integration', () => {
    it('should return current line height via getAttributes for paragraph', () => {
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      const attrs = editor.getAttributes('paragraph');
      expect(attrs.lineHeight).toBe('1.5');
    });

    it('should return current line height via getAttributes for heading', () => {
      editor.commands.setContent('<h1>Test heading</h1>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('2.0');

      const attrs = editor.getAttributes('heading');
      expect(attrs.lineHeight).toBe('2.0');
    });

    it('should return default line height for new content', () => {
      const attrs = editor.getAttributes('paragraph');
      expect(attrs.lineHeight).toBe('1.15');
    });
  });

  describe('Editor State Integration', () => {
    it('should maintain line height across text edits', () => {
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');
      
      // Move cursor to end and insert text (simulating typing)
      editor.commands.setTextSelection({ from: editor.state.doc.content.size - 1, to: editor.state.doc.content.size - 1 });
      editor.commands.insertContent(' Additional text');

      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');
    });

    it('should apply different line heights to different paragraphs', () => {
      editor.commands.setContent('<p>First</p><p>Second</p>');
      
      // Set line height on first paragraph
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLineHeight('1.5');

      // Set different line height on second paragraph  
      editor.commands.setTextSelection({ from: 8, to: 13 });
      editor.commands.setLineHeight('2.0');

      const firstParagraph = editor.state.doc.firstChild;
      const secondParagraph = editor.state.doc.lastChild;

      expect(firstParagraph?.attrs.lineHeight).toBe('1.5');
      expect(secondParagraph?.attrs.lineHeight).toBe('2.0');
    });

    it('should work with mixed content types', () => {
      editor.commands.setContent('<h1>Heading</h1><p>Paragraph</p>');
      
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      editor.state.doc.forEach((node) => {
        if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          expect(node.attrs.lineHeight).toBe('1.5');
        }
      });
    });
  });

  describe('HTML Output Integration', () => {
    it('should include line-height in HTML output', () => {
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      const html = editor.getHTML();
      expect(html).toContain('line-height: 1.5');
    });

    it('should preserve line height when setting HTML content', () => {
      editor.commands.setContent('<p style="line-height: 2.0">Test</p>');
      
      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('2.0');

      // Verify it persists in output
      const html = editor.getHTML();
      expect(html).toContain('line-height: 2.0');
    });
  });

  describe('UI Component Integration', () => {
    it('should provide all data needed for dropdown menu', () => {
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      // Simulate what the UI component needs
      const currentLineHeight = editor.getAttributes('paragraph').lineHeight;
      const availableOptions = ['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'];
      
      expect(currentLineHeight).toBe('1.5');
      expect(availableOptions).toContain(currentLineHeight);
    });

    it('should respond to rapid line height changes', () => {
      editor.commands.selectAll();

      // Simulate user clicking through options quickly
      editor.commands.setLineHeight('1.0');
      editor.commands.setLineHeight('1.5');
      editor.commands.setLineHeight('2.0');

      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('2.0');
    });

    it('should handle cursor movement between nodes with different line heights', () => {
      editor.commands.setContent('<p style="line-height: 1.5">First</p><p style="line-height: 2.0">Second</p>');
      
      // Move cursor to first paragraph
      editor.commands.setTextSelection({ from: 2, to: 2 });
      expect(editor.getAttributes('paragraph').lineHeight).toBe('1.5');

      // Move cursor to second paragraph
      editor.commands.setTextSelection({ from: 9, to: 9 });
      expect(editor.getAttributes('paragraph').lineHeight).toBe('2.0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle applying line height to empty paragraph', () => {
      editor.commands.setContent('<p></p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('1.5');

      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');
    });

    it('should handle multiple paragraphs selected', () => {
      editor.commands.setContent('<p>One</p><p>Two</p><p>Three</p>');
      editor.commands.selectAll();
      editor.commands.setLineHeight('2.0');

      editor.state.doc.forEach((node) => {
        if (node.type.name === 'paragraph') {
          expect(node.attrs.lineHeight).toBe('2.0');
        }
      });
    });

    it('should handle partial paragraph selection', () => {
      editor.commands.setContent('<p>Test paragraph with text</p>');
      editor.commands.setTextSelection({ from: 5, to: 10 });
      editor.commands.setLineHeight('1.5');

      // Line height should apply to the entire paragraph
      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('1.5');
    });
  });

  describe('Chaining Commands', () => {
    it('should work in command chain', () => {
      const result = editor.chain()
        .selectAll()
        .setLineHeight('1.5')
        .run();

      expect(result).toBe(true);
      expect(editor.state.doc.firstChild?.attrs.lineHeight).toBe('1.5');
    });

    it('should chain with other formatting commands', () => {
      editor.chain()
        .selectAll()
        .setLineHeight('2.0')
        .run();

      const paragraph = editor.state.doc.firstChild;
      expect(paragraph?.attrs.lineHeight).toBe('2.0');
    });
  });
});
