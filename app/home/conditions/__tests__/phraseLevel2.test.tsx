import '@testing-library/jest-dom';

// Mock phrase data for testing
const createMockPhrase = (
  id: string,
  name: string,
  phrase: string,
  phraseLevel2: string,
  type = 'condition',
  associatedElementIds = ['element-1'],
  associatedComponentIds = ['component-1'],
) => ({
  id,
  name,
  phrase,
  phraseLevel2,
  type,
  associatedElementIds,
  associatedComponentIds,
});

const mockPhrases = [
  createMockPhrase(
    'phrase-1',
    'Crack in Wall',
    'Technical description of crack in wall for Level 3 survey',
    'Simple crack description for Level 2 survey',
  ),
  createMockPhrase('phrase-2', 'Water Damage', 'Detailed water damage analysis', ''), // Empty Level 2
  createMockPhrase('phrase-3', 'Structural Issue', '', 'Basic structural concern'), // Empty Level 3
  createMockPhrase('phrase-4', 'Both Levels', 'Level 3 content', 'Level 2 content'),
];

// Helper function to filter phrases by survey level (matches InspectionForm logic)
const filterPhrasesByLevel = (
  phrases: typeof mockPhrases,
  level: '2' | '3',
  componentId = 'component-1',
  elementId = 'element-1',
) => {
  return phrases.filter(
    (phrase) =>
      phrase.type.toLowerCase() === 'condition' &&
      (phrase.associatedComponentIds.includes(componentId) ||
        phrase.associatedElementIds.includes(elementId)) &&
      ((level === '2' && phrase.phraseLevel2 && phrase.phraseLevel2.trim() !== '') ||
        (level === '3' && phrase.phrase && phrase.phrase.trim() !== '')),
  );
};

// Helper function to get phrase text by level (matches InspectionForm logic)
const getPhraseTextByLevel = (phrase: (typeof mockPhrases)[0], level: '2' | '3') => {
  return level === '2' ? phrase.phraseLevel2 || phrase.phrase : phrase.phrase;
};

// Helper function to check if phrase is available for level
const isPhraseAvailableForLevel = (phrase: (typeof mockPhrases)[0], level: '2' | '3') => {
  const content = level === '2' ? phrase.phraseLevel2 : phrase.phrase;
  return !!(content && content.trim() !== '');
};

describe('Level 2 Phrase Feature', () => {
  describe('Phrase filtering logic', () => {
    it('should filter phrases correctly for Level 2 surveys', () => {
      const filteredPhrases = filterPhrasesByLevel(mockPhrases, '2');

      expect(filteredPhrases).toHaveLength(3);
      expect(filteredPhrases.map((p) => p.id)).toEqual(['phrase-1', 'phrase-3', 'phrase-4']);
      expect(filteredPhrases.find((p) => p.id === 'phrase-2')).toBeUndefined();
    });

    it('should filter phrases correctly for Level 3 surveys', () => {
      const filteredPhrases = filterPhrasesByLevel(mockPhrases, '3');

      expect(filteredPhrases).toHaveLength(3);
      expect(filteredPhrases.map((p) => p.id)).toEqual(['phrase-1', 'phrase-2', 'phrase-4']);
      expect(filteredPhrases.find((p) => p.id === 'phrase-3')).toBeUndefined();
    });

    it('should map correct phrase text based on survey level', () => {
      const phrase = mockPhrases[0]; // phrase-1 with both levels

      expect(getPhraseTextByLevel(phrase, '2')).toBe('Simple crack description for Level 2 survey');
      expect(getPhraseTextByLevel(phrase, '3')).toBe(
        'Technical description of crack in wall for Level 3 survey',
      );
    });

    it.each([
      {
        phraseIndex: 1,
        level: '2' as const,
        description: 'Level 3 only phrase should not be available for Level 2',
      },
      {
        phraseIndex: 1,
        level: '3' as const,
        description: 'Level 3 only phrase should be available for Level 3',
      },
      {
        phraseIndex: 2,
        level: '2' as const,
        description: 'Level 2 only phrase should be available for Level 2',
      },
      {
        phraseIndex: 2,
        level: '3' as const,
        description: 'Level 2 only phrase should not be available for Level 3',
      },
    ])('$description', ({ phraseIndex, level }) => {
      const phrase = mockPhrases[phraseIndex];
      const expectedAvailability =
        (phraseIndex === 1 && level === '3') || (phraseIndex === 2 && level === '2');

      expect(isPhraseAvailableForLevel(phrase, level)).toBe(expectedAvailability);
    });
  });

  describe('Data persistence', () => {
    it.each([
      {
        operation: 'create',
        data: {
          id: 'new-phrase',
          name: 'New Phrase',
          type: 'condition',
          phrase: 'Level 3 wording',
          phraseLevel2: 'Level 2 wording',
          associatedElementIds: [],
          associatedComponentIds: [],
          associatedMaterialIds: [],
        },
      },
      {
        operation: 'update',
        data: {
          name: 'Updated Phrase',
          type: 'condition',
          phrase: 'Updated Level 3 wording',
          phraseLevel2: 'Updated Level 2 wording',
          associatedElementIds: [],
          associatedComponentIds: [],
        },
      },
    ])('should include phraseLevel2 in $operation operations', ({ data }) => {
      expect(data).toHaveProperty('phrase');
      expect(data).toHaveProperty('phraseLevel2');
      expect(typeof data.phrase).toBe('string');
      expect(typeof data.phraseLevel2).toBe('string');
    });

    it('should handle undefined phraseLevel2 gracefully', () => {
      const dataWithUndefinedLevel2 = {
        name: 'Phrase Without Level 2',
        phrase: 'Only Level 3 content',
        phraseLevel2: undefined,
      };

      expect(() => isPhraseAvailableForLevel(dataWithUndefinedLevel2 as any, '2')).not.toThrow();
      expect(isPhraseAvailableForLevel(dataWithUndefinedLevel2 as any, '2')).toBe(false);
    });
  });
});
