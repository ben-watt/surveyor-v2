import type { JSONContent } from '@tiptap/core';
import { tokensToDoc } from '@/lib/conditions/interop';

export type ValidationCode =
  | 'MISSING_KEY'
  | 'EMPTY_OPTIONS'
  | 'DUP_OPTION'
  | 'INVALID_DEFAULT';

export type ValidationIssue = {
  code: ValidationCode;
  message: string;
  path: string[]; // JSON path to the node; useful for decorations and tooling
};

export type ValidationResult = { ok: boolean; issues: ValidationIssue[] };

export function validateInlineSelectAttrs(attrs: any, path: string[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const key = String((attrs && attrs.key) || '').trim();
  const options: string[] = Array.isArray(attrs?.options) ? attrs.options : [];
  const defaultValue: string | null = (attrs && (attrs.defaultValue as any)) ?? null;

  if (!key) {
    issues.push({ code: 'MISSING_KEY', message: 'InlineSelect is missing a key', path });
  }
  if (!options.length) {
    issues.push({ code: 'EMPTY_OPTIONS', message: `InlineSelect ${key || '(no key)'} has no options`, path });
  }
  // Duplicate/empty option checks
  const seen = new Set<string>();
  for (const raw of options) {
    const option = String(raw ?? '').trim();
    if (!option) {
      issues.push({
        code: 'EMPTY_OPTIONS',
        message: `InlineSelect ${key || '(no key)'} has an empty option`,
        path,
      });
    }
    if (seen.has(option)) {
      issues.push({
        code: 'DUP_OPTION',
        message: `InlineSelect ${key || '(no key)'} has duplicate option "${option}"`,
        path,
      });
    }
    seen.add(option);
  }

  if (defaultValue && !options.includes(defaultValue)) {
    issues.push({
      code: 'INVALID_DEFAULT',
      message: `Default "${defaultValue}" is not in options for ${key || '(no key)'}`,
      path,
    });
  }

  return issues;
}

export function validateDoc(doc: JSONContent): ValidationResult {
  const issues: ValidationIssue[] = [];

  const walk = (node: any, path: string[]) => {
    if (!node) return;
    if (node.type === 'inlineSelect') {
      issues.push(...validateInlineSelectAttrs(node.attrs || {}, path));
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any, index: number) => walk(child, [...path, 'content', String(index)]));
    }
  };

  walk(doc as any, ['doc']);
  return { ok: issues.length === 0, issues };
}

export function validateTemplate(template: string): ValidationResult {
  try {
    const doc = tokensToDoc(template);
    return validateDoc(doc);
  } catch (e) {
    // If parsing fails, treat as a hard error at root
    return {
      ok: false,
      issues: [
        {
          code: 'EMPTY_OPTIONS',
          message: 'Failed to parse template for validation',
          path: ['doc'],
        },
      ],
    };
  }
}


// Returns true if any InlineSelect in the doc is missing both value and defaultValue
export function isDocUnresolved(doc: JSONContent | undefined | null): boolean {
  if (!doc) return false;
  let unresolved = false;
  const walk = (node: any) => {
    if (!node || unresolved) return;
    if (node.type === 'inlineSelect') {
      const v = node.attrs?.value ?? node.attrs?.defaultValue ?? '';
      if (!v) unresolved = true;
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc as any);
  return unresolved;
}


