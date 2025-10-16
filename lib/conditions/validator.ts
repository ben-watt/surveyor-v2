import type { JSONContent } from '@tiptap/core';
import { tokensToDoc } from '@/lib/conditions/interop';

export type ValidationCode = 'MISSING_KEY' | 'EMPTY_OPTIONS' | 'DUP_OPTION' | 'INVALID_DEFAULT';

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
    issues.push({
      code: 'EMPTY_OPTIONS',
      message: `InlineSelect ${key || '(no key)'} has no options`,
      path,
    });
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
      node.content.forEach((child: any, index: number) =>
        walk(child, [...path, 'content', String(index)]),
      );
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

// Heuristic check when only a tokenized phrase is available. Flags unresolved when
// a select token exists without an explicit default (e.g. `{{select:key|opt1|opt2}}`).
export function isPhraseLikelyUnresolved(phrase: string | undefined | null): boolean {
  if (!phrase) return false;
  // Quick scan: any `{{select` token without `default=` inside
  const tokenPattern = /\{\{\s*select\*?:[^}]+\}\}/g; // matches select or select*
  const matches = phrase.match(tokenPattern);
  if (!matches) return false;
  for (const token of matches) {
    const hasDefault = /default\s*=\s*[^|}]+/i.test(token);
    // If token was `select*:` but still lacks default, treat as unresolved too
    if (!hasDefault) return true;
  }
  return false;
}

// Preferred helper for UI: use `doc` if present; otherwise fall back to tokenized `phrase`.
export function isConditionUnresolved(condition: { doc?: JSONContent | null; phrase?: string }): boolean {
  if (condition && condition.doc) return isDocUnresolved(condition.doc);
  return isPhraseLikelyUnresolved(condition?.phrase ?? '');
}

// Level-aware validation helper: checks the appropriate doc/phrase based on survey level
export function isConditionUnresolvedForLevel(
  condition: { phrase?: string; doc?: any; phraseLevel2?: string; docLevel2?: any },
  level: '2' | '3',
): boolean {
  const doc = level === '2' ? condition.docLevel2 : condition.doc;
  const phrase = level === '2' ? condition.phraseLevel2 : condition.phrase;

  if (doc) return isDocUnresolved(doc);
  if (phrase) return isPhraseLikelyUnresolved(phrase);
  return false;
}

// Helper to check if a condition is missing Level 2 content
// Returns true if the condition lacks Level 2 text (empty or undefined)
// Useful for flagging library phrases that need Level 2 content added
export function isMissingLevel2Content(
  condition: { phraseLevel2?: string },
): boolean {
  return !condition.phraseLevel2 || condition.phraseLevel2.trim().length === 0;
}
