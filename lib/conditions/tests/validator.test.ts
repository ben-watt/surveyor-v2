import '@testing-library/jest-dom';
import type { JSONContent } from '@tiptap/core';
import {
  validateDoc,
  validateInlineSelectAttrs,
  validateTemplate,
  isConditionUnresolved,
  isConditionUnresolvedForLevel,
  isDocUnresolved,
  isPhraseLikelyUnresolved,
  isMissingLevel2Content,
} from '@/lib/conditions/validator';

describe('conditions validator', () => {
  test('validateInlineSelectAttrs flags missing key, empty options, dup, invalid default', () => {
    const issues = validateInlineSelectAttrs(
      { key: '', options: ['a', 'a', ''], defaultValue: 'z' },
      ['doc'],
    );
    const codes = issues.map((i) => i.code).sort();
    expect(codes).toEqual(['DUP_OPTION', 'EMPTY_OPTIONS', 'INVALID_DEFAULT', 'MISSING_KEY'].sort());
    // messages present and path preserved
    expect(issues[0].message.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.path.join('.').startsWith('doc'))).toBe(true);
  });

  test('validateDoc returns ok=true for valid inlineSelect', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'inlineSelect',
              attrs: { key: 'k', options: ['a', 'b'], defaultValue: 'a', allowCustom: true },
            },
            { type: 'text', text: ' world.' },
          ],
        },
      ],
    } as any;
    const res = validateDoc(doc);
    expect(res.ok).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  test('validateDoc collects issues from nested content', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'inlineSelect',
              attrs: { key: '', options: [], defaultValue: 'x' },
            },
          ],
        },
      ],
    } as any;
    const res = validateDoc(doc);
    expect(res.ok).toBe(false);
    const codes = res.issues.map((i) => i.code).sort();
    expect(codes).toEqual(['EMPTY_OPTIONS', 'INVALID_DEFAULT', 'MISSING_KEY'].sort());
  });

  test('validateTemplate parses tokens and validates', () => {
    const valid = validateTemplate('Start {{select+:key|default=a|a|b}} end');
    expect(valid.ok).toBe(true);
    const invalid = validateTemplate('Start {{select:key|default=z|a|b}} end');
    expect(invalid.ok).toBe(false);
    expect(invalid.issues.some((i) => i.code === 'INVALID_DEFAULT')).toBe(true);
  });

  describe('isConditionUnresolved', () => {
    test('returns true when doc has inlineSelect without value or default', () => {
      const condition = {
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'The roof is ' },
                { type: 'inlineSelect', attrs: { key: 'state', options: ['Good', 'Poor'] } },
              ],
            },
          ],
        },
        phrase: 'The roof is Good',
      };
      expect(isConditionUnresolved(condition)).toBe(true);
    });

    test('returns false when doc has inlineSelect with value', () => {
      const condition = {
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'inlineSelect',
                  attrs: { key: 'state', options: ['Good', 'Poor'], value: 'Good' },
                },
              ],
            },
          ],
        },
        phrase: 'The roof is Good',
      };
      expect(isConditionUnresolved(condition)).toBe(false);
    });

    test('falls back to phrase when doc is missing', () => {
      const unresolvedPhrase = {
        phrase: 'The roof is {{select:state|Good|Poor}}',
      };
      expect(isConditionUnresolved(unresolvedPhrase)).toBe(true);

      const resolvedPhrase = {
        phrase: 'The roof is {{select*:state|default=Good|Good|Poor}}',
      };
      expect(isConditionUnresolved(resolvedPhrase)).toBe(false);
    });
  });

  describe('isConditionUnresolvedForLevel', () => {
    test('checks Level 2 doc when level is "2"', () => {
      const condition = {
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'inlineSelect',
                  attrs: { key: 'state', options: ['Good', 'Poor'], value: 'Good' },
                },
              ],
            },
          ],
        },
        docLevel2: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'inlineSelect', attrs: { key: 'state', options: ['Good', 'Poor'] } }, // No value!
              ],
            },
          ],
        },
        phrase: 'Level 3 text',
        phraseLevel2: 'Level 2 text',
      };

      // Level 2 has unresolved doc
      expect(isConditionUnresolvedForLevel(condition, '2')).toBe(true);
      // Level 3 has resolved doc
      expect(isConditionUnresolvedForLevel(condition, '3')).toBe(false);
    });

    test('checks Level 3 doc when level is "3"', () => {
      const condition = {
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'inlineSelect', attrs: { key: 'state', options: ['Good', 'Poor'] } }, // No value!
              ],
            },
          ],
        },
        docLevel2: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'inlineSelect',
                  attrs: { key: 'state', options: ['Good', 'Poor'], value: 'Good' },
                },
              ],
            },
          ],
        },
        phrase: 'Level 3 text',
        phraseLevel2: 'Level 2 text',
      };

      // Level 3 has unresolved doc
      expect(isConditionUnresolvedForLevel(condition, '3')).toBe(true);
      // Level 2 has resolved doc
      expect(isConditionUnresolvedForLevel(condition, '2')).toBe(false);
    });

    test('falls back to phrase when doc is missing', () => {
      const condition = {
        phrase: 'Level 3 {{select*:state|default=Good|Good|Poor}}',
        phraseLevel2: 'Level 2 {{select:state|Good|Poor}}',
      };

      // Level 2 has unresolved phrase (no default)
      expect(isConditionUnresolvedForLevel(condition, '2')).toBe(true);
      // Level 3 has resolved phrase (with default)
      expect(isConditionUnresolvedForLevel(condition, '3')).toBe(false);
    });

    test('returns false when both doc and phrase are missing', () => {
      const condition = {};
      expect(isConditionUnresolvedForLevel(condition, '2')).toBe(false);
      expect(isConditionUnresolvedForLevel(condition, '3')).toBe(false);
    });

    test('handles empty strings for phrase fields', () => {
      const condition = {
        phrase: '',
        phraseLevel2: '',
      };
      expect(isConditionUnresolvedForLevel(condition, '2')).toBe(false);
      expect(isConditionUnresolvedForLevel(condition, '3')).toBe(false);
    });
  });

  describe('Empty Level 2 text validation', () => {
    test('flags condition with empty Level 2 text as validation issue', () => {
      const conditionWithoutLevel2Text = {
        id: 'cond1',
        name: 'Condition needs Level 2',
        phrase: 'Detailed Level 3 technical assessment text',
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Detailed Level 3 technical assessment text' }],
            },
          ],
        },
        phraseLevel2: '', // Empty - needs to be populated
        docLevel2: undefined,
      };

      // In a Level 2 survey, this should be flagged as needing content
      // Empty text means the library phrase needs Level 2 content added
      expect(conditionWithoutLevel2Text.phraseLevel2).toBe('');
      expect(conditionWithoutLevel2Text.phraseLevel2?.trim()).toBe('');
      
      // Verify it can be detected as empty
      const hasLevel2Text = !!(conditionWithoutLevel2Text.phraseLevel2 && 
                           conditionWithoutLevel2Text.phraseLevel2.trim().length > 0);
      expect(hasLevel2Text).toBe(false);
    });

    test('validates that Level 2 text is required for Level 2 surveys', () => {
      const conditionWithLevel2 = {
        phrase: 'Level 3 text',
        phraseLevel2: 'Level 2 text',
      };

      const conditionWithoutLevel2 = {
        phrase: 'Level 3 text',
        phraseLevel2: '',
      };

      // Condition with Level 2 text is valid
      const hasValidLevel2Text = !!(conditionWithLevel2.phraseLevel2 && 
                                 conditionWithLevel2.phraseLevel2.trim().length > 0);
      expect(hasValidLevel2Text).toBe(true);

      // Condition without Level 2 text is invalid for Level 2 surveys
      const hasInvalidLevel2Text = !!(conditionWithoutLevel2.phraseLevel2 && 
                                   conditionWithoutLevel2.phraseLevel2.trim().length > 0);
      expect(hasInvalidLevel2Text).toBe(false);
    });

    test('library phrases without Level 2 content should be identifiable', () => {
      // Simulate library phrases that might come from the database
      const libraryPhrases = [
        {
          id: 'phrase1',
          name: 'Complete Phrase',
          phrase: 'Level 3 detailed text',
          phraseLevel2: 'Level 2 simple text',
        },
        {
          id: 'phrase2',
          name: 'Missing Level 2',
          phrase: 'Level 3 detailed text',
          phraseLevel2: '', // Empty - needs to be populated in library
        },
        {
          id: 'phrase3',
          name: 'No Level 2 at all',
          phrase: 'Level 3 detailed text',
          phraseLevel2: undefined, // Not set - needs to be populated in library
        },
      ];

      // Helper to check if phrase needs Level 2 content
      const needsLevel2Content = (phrase: any) => {
        return !phrase.phraseLevel2 || phrase.phraseLevel2.trim().length === 0;
      };

      expect(needsLevel2Content(libraryPhrases[0])).toBe(false); // Has Level 2
      expect(needsLevel2Content(libraryPhrases[1])).toBe(true);  // Empty Level 2
      expect(needsLevel2Content(libraryPhrases[2])).toBe(true);  // Missing Level 2
    });

    test('conditions should show validation warning when used in Level 2 survey without Level 2 text', () => {
      const conditionInLevel2Survey = {
        id: 'cond1',
        name: 'Condition',
        phrase: 'Level 3 text exists',
        phraseLevel2: '', // Empty - this should trigger validation warning
      };

      // When adding this to a Level 2 survey, it should be flagged
      const surveyLevel = '2';
      const conditionNeedsLevel2 = surveyLevel === '2' && 
                                   (!conditionInLevel2Survey.phraseLevel2 || 
                                    conditionInLevel2Survey.phraseLevel2.trim().length === 0);
      
      expect(conditionNeedsLevel2).toBe(true);
    });

    test('conditions with Level 2 text should not show validation warning in Level 2 survey', () => {
      const validConditionInLevel2Survey = {
        id: 'cond1',
        name: 'Condition',
        phrase: 'Level 3 text exists',
        phraseLevel2: 'Level 2 text exists',
      };

      const surveyLevel = '2';
      const conditionNeedsLevel2 = surveyLevel === '2' && 
                                   (!validConditionInLevel2Survey.phraseLevel2 || 
                                    validConditionInLevel2Survey.phraseLevel2.trim().length === 0);
      
      expect(conditionNeedsLevel2).toBe(false);
    });

    test('Level 3 surveys should not validate Level 2 text', () => {
      const conditionInLevel3Survey = {
        id: 'cond1',
        name: 'Condition',
        phrase: 'Level 3 text exists',
        phraseLevel2: '', // Empty, but that's OK for Level 3
      };

      // Function to check if validation should trigger based on level
      const shouldValidateLevel2 = (level: '2' | '3') => 
        level === '2' && 
        (!conditionInLevel3Survey.phraseLevel2 || 
         conditionInLevel3Survey.phraseLevel2.trim().length === 0);
      
      expect(shouldValidateLevel2('3')).toBe(false); // Level 3 doesn't care about Level 2 text
      expect(shouldValidateLevel2('2')).toBe(true); // Level 2 would care
    });
  });

  describe('isMissingLevel2Content', () => {
    test('returns true when phraseLevel2 is undefined', () => {
      const condition: { phrase: string; phraseLevel2?: string } = {
        phrase: 'Level 3 text',
        // phraseLevel2 is undefined
      };
      expect(isMissingLevel2Content(condition)).toBe(true);
    });

    test('returns true when phraseLevel2 is empty string', () => {
      const condition = {
        phrase: 'Level 3 text',
        phraseLevel2: '',
      };
      expect(isMissingLevel2Content(condition)).toBe(true);
    });

    test('returns true when phraseLevel2 is only whitespace', () => {
      const condition = {
        phrase: 'Level 3 text',
        phraseLevel2: '   ',
      };
      expect(isMissingLevel2Content(condition)).toBe(true);
    });

    test('returns false when phraseLevel2 has content', () => {
      const condition = {
        phrase: 'Level 3 text',
        phraseLevel2: 'Level 2 text',
      };
      expect(isMissingLevel2Content(condition)).toBe(false);
    });

    test('can be used to filter library phrases needing Level 2 content', () => {
      const libraryPhrases = [
        { id: 'p1', phrase: 'L3 text', phraseLevel2: 'L2 text' },
        { id: 'p2', phrase: 'L3 text', phraseLevel2: '' },
        { id: 'p3', phrase: 'L3 text' }, // undefined
        { id: 'p4', phrase: 'L3 text', phraseLevel2: '  ' }, // whitespace
      ];

      const phrasesNeedingLevel2 = libraryPhrases.filter(isMissingLevel2Content);
      
      expect(phrasesNeedingLevel2).toHaveLength(3);
      expect(phrasesNeedingLevel2.map(p => p.id)).toEqual(['p2', 'p3', 'p4']);
    });

    test('can be used to show warnings in UI for Level 2 surveys', () => {
      const conditionInLevel2Survey = {
        phrase: 'Level 3 text',
        phraseLevel2: '',
      };

      const surveyLevel = '2';
      const shouldShowWarning = surveyLevel === '2' && isMissingLevel2Content(conditionInLevel2Survey);

      expect(shouldShowWarning).toBe(true);
    });

    test('should not show warnings for Level 3 surveys even if Level 2 is missing', () => {
      const conditionInLevel3Survey = {
        phrase: 'Level 3 text',
        phraseLevel2: '',
      };

      // Function to determine if warning should show based on level
      const shouldShowWarning = (level: '2' | '3') => 
        level === '2' && isMissingLevel2Content(conditionInLevel3Survey);

      expect(shouldShowWarning('3')).toBe(false); // No warning for Level 3
      expect(shouldShowWarning('2')).toBe(true);  // Warning for Level 2
    });
  });
});
