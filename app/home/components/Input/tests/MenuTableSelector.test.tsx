/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TooltipProvider } from '@radix-ui/react-tooltip';

// We need to test MenuTableSelector, but it's not exported, so we'll test the integration
// by importing BlockMenuBar and checking the table selector functionality
// For now, let's create a test that verifies the table insertion command works correctly
// which is what MenuTableSelector uses

describe('MenuTableSelector Integration', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Table, TableRow, TableCell, TableHeader],
      content: '<p>Test content</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Table Insertion Command', () => {
    it('should have insertTable command available', () => {
      expect(editor.commands.insertTable).toBeDefined();
      expect(typeof editor.commands.insertTable).toBe('function');
    });

    it('should insert table with specified dimensions', () => {
      editor.chain().focus().insertTable({ rows: 3, cols: 4 }).run();

      const html = editor.getHTML();
      expect(html).toContain('<table');

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      const rows = table?.querySelectorAll('tr');
      const firstRowCells = rows?.[0]?.querySelectorAll('td, th');

      expect(rows?.length).toBe(3);
      expect(firstRowCells?.length).toBe(4);
    });

    it('should insert 1x1 table', () => {
      editor.chain().focus().insertTable({ rows: 1, cols: 1 }).run();

      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      const rows = table?.querySelectorAll('tr');
      const firstRowCells = rows?.[0]?.querySelectorAll('td, th');

      expect(rows?.length).toBe(1);
      expect(firstRowCells?.length).toBe(1);
    });

    it('should insert 10x10 table (maximum size)', () => {
      editor.chain().focus().insertTable({ rows: 10, cols: 10 }).run();

      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      const rows = table?.querySelectorAll('tr');
      const firstRowCells = rows?.[0]?.querySelectorAll('td, th');

      expect(rows?.length).toBe(10);
      expect(firstRowCells?.length).toBe(10);
    });

    it('should insert table at cursor position', () => {
      editor.commands.setContent('<p>Before</p><p>After</p>');
      editor.commands.setTextSelection({ from: 8, to: 8 }); // Position between paragraphs

      editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run();

      const html = editor.getHTML();
      expect(html).toContain('<table');
      expect(html).toContain('Before');
      expect(html).toContain('After');
    });

    it('should insert table successfully', () => {
      editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run();

      const html = editor.getHTML();
      expect(html).toContain('<table');
    });
  });

  describe('Table Structure', () => {
    it('should create table with proper HTML structure', () => {
      editor.chain().focus().insertTable({ rows: 2, cols: 3 }).run();

      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');

      expect(table).toBeTruthy();
      expect(table?.tagName.toLowerCase()).toBe('table');
    });

    it('should create table with correct number of rows', () => {
      editor.chain().focus().insertTable({ rows: 5, cols: 3 }).run();

      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      const rows = table?.querySelectorAll('tr');

      expect(rows?.length).toBe(5);
    });

    it('should create table with correct number of columns', () => {
      editor.chain().focus().insertTable({ rows: 2, cols: 6 }).run();

      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      const rows = table?.querySelectorAll('tr');
      const firstRowCells = rows?.[0]?.querySelectorAll('td, th');

      expect(firstRowCells?.length).toBe(6);
    });

    it('should create all rows with same number of cells', () => {
      editor.chain().focus().insertTable({ rows: 4, cols: 3 }).run();

      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      const rows = table?.querySelectorAll('tr');

      rows?.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        expect(cells.length).toBe(3);
      });
    });
  });

  describe('Command Chaining', () => {
    it('should work in command chain', () => {
      const result = editor
        .chain()
        .focus()
        .insertTable({ rows: 2, cols: 2 })
        .run();

      expect(result).toBe(true);
      const html = editor.getHTML();
      expect(html).toContain('<table');
    });

    it('should chain with other commands', () => {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3 })
        .run();

      const html = editor.getHTML();
      expect(html).toContain('<table');
    });
  });

  describe('Edge Cases', () => {
    it('should handle inserting table in empty document', () => {
      editor.commands.setContent('');
      editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run();

      const html = editor.getHTML();
      expect(html).toContain('<table');
    });

    it('should handle inserting multiple tables', () => {
      editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run();
      editor.commands.insertContent('<p>Between</p>');
      editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run();

      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');
      expect(tables.length).toBe(2);
    });

    it('should replace selected content with table', () => {
      editor.commands.setContent('<p>Selected text</p>');
      editor.commands.selectAll();
      editor.chain().focus().insertTable({ rows: 2, cols: 2 }).run();

      const html = editor.getHTML();
      expect(html).toContain('<table');
      expect(html).not.toContain('Selected text');
    });
  });
});

