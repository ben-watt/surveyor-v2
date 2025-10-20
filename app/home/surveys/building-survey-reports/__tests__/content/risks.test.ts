/**
 * Tests for risks content module
 */

import {
  BUILDING_RISKS,
  GROUNDS_RISKS,
  PEOPLE_RISKS,
  ALL_RISKS,
  getRisksByCategory,
} from '../../content/risks';

describe('BUILDING_RISKS', () => {
  it('should have exactly 3 building risks', () => {
    expect(Object.keys(BUILDING_RISKS)).toHaveLength(3);
  });

  it('should include timber-rot, tree-proximity, and flood-risk', () => {
    expect(BUILDING_RISKS['timber-rot']).toBeDefined();
    expect(BUILDING_RISKS['tree-proximity']).toBeDefined();
    expect(BUILDING_RISKS['flood-risk']).toBeDefined();
  });

  it('should have category "building" for all risks', () => {
    Object.values(BUILDING_RISKS).forEach(risk => {
      expect(risk.category).toBe('building');
    });
  });

  it('should have unique IDs', () => {
    const ids = Object.values(BUILDING_RISKS).map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have non-empty descriptions', () => {
    Object.values(BUILDING_RISKS).forEach(risk => {
      expect(risk.description).toBeTruthy();
      expect(risk.description.length).toBeGreaterThan(50);
    });
  });

  it('should have severity levels', () => {
    Object.values(BUILDING_RISKS).forEach(risk => {
      expect(risk.severity).toMatch(/^(low|medium|high)$/);
    });
  });
});

describe('GROUNDS_RISKS', () => {
  it('should have exactly 1 grounds risk', () => {
    expect(Object.keys(GROUNDS_RISKS)).toHaveLength(1);
  });

  it('should include invasive-species', () => {
    expect(GROUNDS_RISKS['invasive-species']).toBeDefined();
  });

  it('should have category "grounds"', () => {
    Object.values(GROUNDS_RISKS).forEach(risk => {
      expect(risk.category).toBe('grounds');
    });
  });
});

describe('PEOPLE_RISKS', () => {
  it('should have exactly 3 people risks', () => {
    expect(Object.keys(PEOPLE_RISKS)).toHaveLength(3);
  });

  it('should include asbestos, radon-risk, and electromagnetic-fields', () => {
    expect(PEOPLE_RISKS['asbestos']).toBeDefined();
    expect(PEOPLE_RISKS['radon-risk']).toBeDefined();
    expect(PEOPLE_RISKS['electromagnetic-fields']).toBeDefined();
  });

  it('should have category "people" for all risks', () => {
    Object.values(PEOPLE_RISKS).forEach(risk => {
      expect(risk.category).toBe('people');
    });
  });

  it('should have correct radon description (not duplicating asbestos)', () => {
    const radonRisk = PEOPLE_RISKS['radon-risk'];
    expect(radonRisk.description).toContain('Radon');
    expect(radonRisk.description).toContain('radioactive gas');
    expect(radonRisk.description).not.toContain('ACMs');
    expect(radonRisk.description).not.toContain('Asbestos');
  });

  it('should have asbestos with high severity', () => {
    expect(PEOPLE_RISKS['asbestos'].severity).toBe('high');
  });
});

describe('ALL_RISKS', () => {
  it('should have exactly 7 risks total', () => {
    expect(Object.keys(ALL_RISKS)).toHaveLength(7);
  });

  it('should include all building risks', () => {
    Object.keys(BUILDING_RISKS).forEach(key => {
      expect(ALL_RISKS[key]).toBeDefined();
    });
  });

  it('should include all grounds risks', () => {
    Object.keys(GROUNDS_RISKS).forEach(key => {
      expect(ALL_RISKS[key]).toBeDefined();
    });
  });

  it('should include all people risks', () => {
    Object.keys(PEOPLE_RISKS).forEach(key => {
      expect(ALL_RISKS[key]).toBeDefined();
    });
  });

  it('should have unique IDs across all risks', () => {
    const ids = Object.values(ALL_RISKS).map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

describe('getRisksByCategory', () => {
  it('should return building risks when category is "building"', () => {
    const risks = getRisksByCategory('building');
    expect(risks).toHaveLength(3);
    risks.forEach(risk => {
      expect(risk.category).toBe('building');
    });
  });

  it('should return grounds risks when category is "grounds"', () => {
    const risks = getRisksByCategory('grounds');
    expect(risks).toHaveLength(1);
    risks.forEach(risk => {
      expect(risk.category).toBe('grounds');
    });
  });

  it('should return people risks when category is "people"', () => {
    const risks = getRisksByCategory('people');
    expect(risks).toHaveLength(3);
    risks.forEach(risk => {
      expect(risk.category).toBe('people');
    });
  });
});

