/**
 * Tests for limitations content module
 */

import {
  LIMITATION_ITEMS,
  IMPORTANT_NOTES,
  getClientSpecificLimitation,
} from '../../content/limitations';

describe('LIMITATION_ITEMS', () => {
  it('should have exactly 8 limitation items', () => {
    expect(LIMITATION_ITEMS).toHaveLength(8);
  });

  it('should have unique IDs', () => {
    const ids = LIMITATION_ITEMS.map(item => item.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have sequential order from 1 to 8', () => {
    const orders = LIMITATION_ITEMS.map(item => item.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('should have non-empty text for all items', () => {
    LIMITATION_ITEMS.forEach(item => {
      expect(item.text).toBeTruthy();
      expect(item.text.length).toBeGreaterThan(20);
    });
  });

  it('should include general-standard as first item', () => {
    expect(LIMITATION_ITEMS[0].id).toBe('general-standard');
    expect(LIMITATION_ITEMS[0].text).toContain('general standard');
  });

  it('should include visual-inspection item', () => {
    const visualItem = LIMITATION_ITEMS.find(item => item.id === 'visual-inspection');
    expect(visualItem).toBeDefined();
    expect(visualItem?.text).toContain('visual inspection');
  });

  it('should include specialist-surveys item', () => {
    const specialistItem = LIMITATION_ITEMS.find(item => item.id === 'specialist-surveys');
    expect(specialistItem).toBeDefined();
    expect(specialistItem?.text).toContain('specialist');
  });

  it('should include structural-assessment item', () => {
    const structuralItem = LIMITATION_ITEMS.find(item => item.id === 'structural-assessment');
    expect(structuralItem).toBeDefined();
    expect(structuralItem?.text).toContain('structural assessment');
  });

  it('should include geological-survey item', () => {
    const geologicalItem = LIMITATION_ITEMS.find(item => item.id === 'geological-survey');
    expect(geologicalItem).toBeDefined();
    expect(geologicalItem?.text).toContain('geological survey');
  });

  it('should include roof-examination item', () => {
    const roofItem = LIMITATION_ITEMS.find(item => item.id === 'roof-examination');
    expect(roofItem).toBeDefined();
    expect(roofItem?.text).toContain('roof');
  });

  it('should include works-costs as last item', () => {
    expect(LIMITATION_ITEMS[7].id).toBe('works-costs');
    expect(LIMITATION_ITEMS[7].text).toContain('costs');
  });
});

describe('IMPORTANT_NOTES', () => {
  it('should have exactly 4 important notes', () => {
    expect(IMPORTANT_NOTES).toHaveLength(4);
  });

  it('should have non-empty notes', () => {
    IMPORTANT_NOTES.forEach(note => {
      expect(note).toBeTruthy();
      expect(note.length).toBeGreaterThan(50);
    });
  });

  it('should mention desktop study in first note', () => {
    expect(IMPORTANT_NOTES[0]).toContain('desktop study');
  });

  it('should mention roofs and chimneys in second note', () => {
    expect(IMPORTANT_NOTES[1]).toContain('roofs');
    expect(IMPORTANT_NOTES[1]).toContain('chimneys');
  });

  it('should mention floor surfaces in third note', () => {
    expect(IMPORTANT_NOTES[2]).toContain('floor surfaces');
  });

  it('should mention warranty in fourth note', () => {
    expect(IMPORTANT_NOTES[3]).toContain('warranty');
  });
});

describe('getClientSpecificLimitation', () => {
  it('should return a string with client name', () => {
    const result = getClientSpecificLimitation('John Doe');
    expect(result).toContain('John Doe');
  });

  it('should mention "sole use"', () => {
    const result = getClientSpecificLimitation('Jane Smith');
    expect(result).toContain('sole use');
  });

  it('should handle empty client name', () => {
    const result = getClientSpecificLimitation('');
    expect(typeof result).toBe('string');
    expect(result).toContain('sole use');
  });

  it('should handle special characters in client name', () => {
    const result = getClientSpecificLimitation("O'Brien & Associates");
    expect(result).toContain("O'Brien & Associates");
  });
});

