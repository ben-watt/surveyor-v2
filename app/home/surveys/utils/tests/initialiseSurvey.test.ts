import { buildSections } from '../initialiseSurvey';

describe('buildSections', () => {
  const sections = [
    { id: 's2', name: 'B', order: 2, updatedAt: '', syncStatus: 'synced', tenantId: 't' },
    { id: 's1', name: 'A', order: 1, updatedAt: '', syncStatus: 'synced', tenantId: 't' },
  ] as any;

  const elements = [
    {
      id: 'e2',
      name: 'Element 2',
      order: 2,
      sectionId: 's1',
      description: '',
      updatedAt: '',
      syncStatus: 'synced',
      tenantId: 't',
    },
    {
      id: 'e1',
      name: 'Element 1',
      order: 1,
      sectionId: 's1',
      description: '',
      updatedAt: '',
      syncStatus: 'synced',
      tenantId: 't',
    },
    {
      id: 'e3',
      name: 'Element 3',
      order: 1,
      sectionId: 's2',
      description: '',
      updatedAt: '',
      syncStatus: 'synced',
      tenantId: 't',
    },
  ] as any;

  it('orders sections and nests only matching elements ordered by element order', () => {
    const result = buildSections(sections, elements);

    expect(result.map((s) => s.name)).toEqual(['A', 'B']);

    const first = result[0];
    expect(first.id).toBe('s1');
    expect(first.elementSections.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(first.elementSections.every((e) => e.isPartOfSurvey)).toBe(true);
    // Status is now computed reactively, not stored in the data structure

    const second = result[1];
    expect(second.id).toBe('s2');
    expect(second.elementSections.map((e) => e.id)).toEqual(['e3']);
  });

  it('handles empty inputs', () => {
    expect(buildSections([], [])).toEqual([]);
  });
});
