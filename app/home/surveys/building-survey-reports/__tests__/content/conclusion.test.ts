/**
 * Tests for conclusion content module
 */

import { CONCLUSION_PARAGRAPHS, CONCLUSION_CLOSING } from '../../content/conclusion';

describe('CONCLUSION_PARAGRAPHS', () => {
  it('should have exactly 7 conclusion paragraphs', () => {
    expect(CONCLUSION_PARAGRAPHS).toHaveLength(7);
  });

  it('should have unique IDs', () => {
    const ids = CONCLUSION_PARAGRAPHS.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have sequential order from 1 to 7', () => {
    const orders = CONCLUSION_PARAGRAPHS.map(p => p.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('should have non-empty text for all paragraphs', () => {
    CONCLUSION_PARAGRAPHS.forEach(paragraph => {
      expect(paragraph.text).toBeTruthy();
      expect(paragraph.text.length).toBeGreaterThan(20);
    });
  });

  it('should have structural-condition as first paragraph', () => {
    expect(CONCLUSION_PARAGRAPHS[0].id).toBe('structural-condition');
    expect(CONCLUSION_PARAGRAPHS[0].text).toContain('structural');
  });

  it('should have external-repairs paragraph', () => {
    const externalPara = CONCLUSION_PARAGRAPHS.find(p => p.id === 'external-repairs');
    expect(externalPara).toBeDefined();
    expect(externalPara?.text).toContain('External repairs');
  });

  it('should have internal-condition paragraph', () => {
    const internalPara = CONCLUSION_PARAGRAPHS.find(p => p.id === 'internal-condition');
    expect(internalPara).toBeDefined();
    expect(internalPara?.text).toContain('Internally');
  });

  it('should have certificates-recommendation paragraph', () => {
    const certsPara = CONCLUSION_PARAGRAPHS.find(p => p.id === 'certificates-recommendation');
    expect(certsPara).toBeDefined();
    expect(certsPara?.text).toContain('certificates');
  });

  it('should have drainage-recommendation paragraph', () => {
    const drainagePara = CONCLUSION_PARAGRAPHS.find(p => p.id === 'drainage-recommendation');
    expect(drainagePara).toBeDefined();
    expect(drainagePara?.text).toContain('drainage');
  });

  it('should have financial-considerations paragraph', () => {
    const financialPara = CONCLUSION_PARAGRAPHS.find(p => p.id === 'financial-considerations');
    expect(financialPara).toBeDefined();
    expect(financialPara?.text).toContain('financial');
  });

  it('should have legal-review as last paragraph', () => {
    expect(CONCLUSION_PARAGRAPHS[6].id).toBe('legal-review');
    expect(CONCLUSION_PARAGRAPHS[6].text).toContain('solicitor');
  });
});

describe('CONCLUSION_CLOSING', () => {
  it('should be a non-empty string', () => {
    expect(typeof CONCLUSION_CLOSING).toBe('string');
    expect(CONCLUSION_CLOSING.length).toBeGreaterThan(10);
  });

  it('should mention "discuss matters further"', () => {
    expect(CONCLUSION_CLOSING).toContain('discuss matters further');
  });

  it('should mention "contact"', () => {
    expect(CONCLUSION_CLOSING).toContain('contact');
  });
});

