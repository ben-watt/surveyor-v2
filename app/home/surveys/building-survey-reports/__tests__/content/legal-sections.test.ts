/**
 * Tests for legal sections content module
 */

import {
  STATUTORY_ITEMS,
  PLANNING_BUILDING_REGULATIONS_CONTENT,
  THERMAL_INSULATION_CONTENT,
  LEGAL_SECTIONS,
} from '../../content/legal-sections';

describe('STATUTORY_ITEMS', () => {
  it('should have exactly 11 statutory items', () => {
    expect(STATUTORY_ITEMS).toHaveLength(11);
  });

  it('should have unique IDs', () => {
    const ids = STATUTORY_ITEMS.map(item => item.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have sequential order from 1 to 11', () => {
    const orders = STATUTORY_ITEMS.map(item => item.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('should have non-empty text for all items', () => {
    STATUTORY_ITEMS.forEach(item => {
      expect(item.text).toBeTruthy();
      expect(item.text.length).toBeGreaterThan(20);
    });
  });

  it('should include statutory approvals as first item', () => {
    expect(STATUTORY_ITEMS[0].id).toBe('statutory-approvals');
    expect(STATUTORY_ITEMS[0].text).toContain('Statutory Approvals');
  });

  it('should include services connection as last item', () => {
    expect(STATUTORY_ITEMS[10].id).toBe('services-connection');
    expect(STATUTORY_ITEMS[10].text).toContain('main services');
  });

  it('should include boundaries item', () => {
    const boundariesItem = STATUTORY_ITEMS.find(item => item.id === 'boundaries');
    expect(boundariesItem).toBeDefined();
    expect(boundariesItem?.text).toContain('boundaries');
  });
});

describe('PLANNING_BUILDING_REGULATIONS_CONTENT', () => {
  it('should be a non-empty string', () => {
    expect(typeof PLANNING_BUILDING_REGULATIONS_CONTENT).toBe('string');
    expect(PLANNING_BUILDING_REGULATIONS_CONTENT.length).toBeGreaterThan(50);
  });

  it('should mention Building Regulations', () => {
    expect(PLANNING_BUILDING_REGULATIONS_CONTENT).toContain('Building Regulations');
  });

  it('should mention certificates and warranties', () => {
    expect(PLANNING_BUILDING_REGULATIONS_CONTENT).toContain('certificates');
    expect(PLANNING_BUILDING_REGULATIONS_CONTENT).toContain('warranties');
  });
});

describe('THERMAL_INSULATION_CONTENT', () => {
  it('should have exactly 2 paragraphs', () => {
    expect(THERMAL_INSULATION_CONTENT).toHaveLength(2);
  });

  it('should have non-empty paragraphs', () => {
    THERMAL_INSULATION_CONTENT.forEach(paragraph => {
      expect(paragraph).toBeTruthy();
      expect(paragraph.length).toBeGreaterThan(50);
    });
  });

  it('should mention Energy Performance Certificate in first paragraph', () => {
    expect(THERMAL_INSULATION_CONTENT[0]).toContain('Energy Performance Certificate');
  });

  it('should mention MEES in second paragraph', () => {
    expect(THERMAL_INSULATION_CONTENT[1]).toContain('MEES');
  });

  it('should mention date "1 April 2018" in second paragraph', () => {
    expect(THERMAL_INSULATION_CONTENT[1]).toContain('1 April 2018');
  });
});

describe('LEGAL_SECTIONS', () => {
  it('should have exactly 3 sections', () => {
    expect(LEGAL_SECTIONS).toHaveLength(3);
  });

  it('should have correct section IDs', () => {
    const ids = LEGAL_SECTIONS.map(section => section.id);
    expect(ids).toEqual([
      'planning-building-regulations',
      'statutory',
      'thermal-insulation-energy-efficiency',
    ]);
  });

  it('should have titles for all sections', () => {
    LEGAL_SECTIONS.forEach(section => {
      expect(section.title).toBeTruthy();
      expect(section.title.length).toBeGreaterThan(5);
    });
  });

  it('should have planning section with content', () => {
    const planningSection = LEGAL_SECTIONS.find(
      s => s.id === 'planning-building-regulations'
    );
    expect(planningSection).toBeDefined();
    expect(planningSection?.content).toBeDefined();
  });

  it('should have statutory section with items', () => {
    const statutorySection = LEGAL_SECTIONS.find(s => s.id === 'statutory');
    expect(statutorySection).toBeDefined();
    expect(statutorySection?.items).toBeDefined();
    expect(statutorySection?.items).toHaveLength(11);
  });
});

