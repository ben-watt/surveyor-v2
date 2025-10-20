/**
 * Tests for definitions content module
 */

import {
  RAG_KEY,
  NOT_INSPECTED,
  TIMEFRAME_GLOSSARY,
  CRACK_DEFINITIONS,
} from '../../content/definitions';

describe('RAG_KEY', () => {
  it('should have exactly 3 items', () => {
    expect(RAG_KEY).toHaveLength(3);
  });

  it('should have green, orange, and red colors', () => {
    const colors = RAG_KEY.map(item => item.color);
    expect(colors).toEqual(['green', 'orange', 'red']);
  });

  it('should have unique descriptions', () => {
    const descriptions = RAG_KEY.map(item => item.description);
    const uniqueDescriptions = new Set(descriptions);
    expect(descriptions.length).toBe(uniqueDescriptions.size);
  });

  it('should have non-empty descriptions for all items', () => {
    RAG_KEY.forEach(item => {
      expect(item.description).toBeTruthy();
      expect(item.description.length).toBeGreaterThan(10);
    });
  });
});

describe('NOT_INSPECTED', () => {
  it('should have label "NI"', () => {
    expect(NOT_INSPECTED.label).toBe('NI');
  });

  it('should have a description', () => {
    expect(NOT_INSPECTED.description).toBe('Not inspected');
  });
});

describe('TIMEFRAME_GLOSSARY', () => {
  it('should have exactly 4 timeframe definitions', () => {
    expect(TIMEFRAME_GLOSSARY).toHaveLength(4);
  });

  it('should include all expected terms', () => {
    const terms = TIMEFRAME_GLOSSARY.map(item => item.term);
    expect(terms).toEqual(['Immediate', 'Short Term', 'Medium Term', 'Long Term']);
  });

  it('should have descriptions for all terms', () => {
    TIMEFRAME_GLOSSARY.forEach(item => {
      expect(item.description).toBeTruthy();
      expect(item.description.length).toBeGreaterThan(5);
    });
  });

  it('should have descriptions containing "year" or "years"', () => {
    TIMEFRAME_GLOSSARY.forEach(item => {
      expect(item.description.toLowerCase()).toMatch(/years?/);
    });
  });
});

describe('CRACK_DEFINITIONS', () => {
  it('should have exactly 6 crack categories', () => {
    expect(CRACK_DEFINITIONS).toHaveLength(6);
  });

  it('should have sequential categories from 0 to 5', () => {
    const categories = CRACK_DEFINITIONS.map(item => item.category);
    expect(categories).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('should have unique severity labels', () => {
    const severities = CRACK_DEFINITIONS.map(item => item.severity);
    const uniqueSeverities = new Set(severities);
    expect(severities.length).toBe(uniqueSeverities.size);
  });

  it('should have width measurements for all categories', () => {
    CRACK_DEFINITIONS.forEach(item => {
      expect(item.width).toBeTruthy();
      expect(item.width).toMatch(/mm/);
    });
  });

  it('should include "Negligible" as first category', () => {
    expect(CRACK_DEFINITIONS[0].severity).toBe('Negligible');
  });

  it('should include "Very severe" as last category', () => {
    expect(CRACK_DEFINITIONS[5].severity).toBe('Very severe');
  });

  it('should have correct width for very severe cracks', () => {
    const verySevere = CRACK_DEFINITIONS.find(c => c.severity === 'Very severe');
    expect(verySevere?.width).toBe('> 25mm');
  });
});

