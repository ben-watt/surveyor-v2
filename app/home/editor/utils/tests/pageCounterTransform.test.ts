import { transformPageCounters, hasPageCounters } from '../pageCounterTransform';

describe('transformPageCounters', () => {
  describe('basic transformations', () => {
    it('should transform {{pageNumber}} to page counter span', () => {
      const input = '{{pageNumber}}';
      const expected = '<span class="paged-counter" data-counter-type="page"></span>';
      expect(transformPageCounters(input)).toBe(expected);
    });

    it('should transform {{totalPages}} to pages counter span', () => {
      const input = '{{totalPages}}';
      const expected = '<span class="paged-counter" data-counter-type="pages"></span>';
      expect(transformPageCounters(input)).toBe(expected);
    });

    it('should handle empty string', () => {
      expect(transformPageCounters('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(transformPageCounters(null as any)).toBe(null);
      expect(transformPageCounters(undefined as any)).toBe(undefined);
    });
  });

  describe('formatted page numbers', () => {
    it('should transform "Page X of Y" format', () => {
      const input = 'Page {{pageNumber}} of {{totalPages}}';
      const expected = 'Page <span class="paged-counter" data-counter-type="page"></span> of <span class="paged-counter" data-counter-type="pages"></span>';
      expect(transformPageCounters(input)).toBe(expected);
    });

    it('should transform "X/Y" format', () => {
      const input = '{{pageNumber}}/{{totalPages}}';
      const expected = '<span class="paged-counter" data-counter-type="page"></span>/<span class="paged-counter" data-counter-type="pages"></span>';
      expect(transformPageCounters(input)).toBe(expected);
    });

    it('should transform "[X/Y]" format', () => {
      const input = '[{{pageNumber}}/{{totalPages}}]';
      const expected = '[<span class="paged-counter" data-counter-type="page"></span>/<span class="paged-counter" data-counter-type="pages"></span>]';
      expect(transformPageCounters(input)).toBe(expected);
    });

    it('should preserve surrounding HTML tags', () => {
      const input = '<p>Page {{pageNumber}}</p>';
      const expected = '<p>Page <span class="paged-counter" data-counter-type="page"></span></p>';
      expect(transformPageCounters(input)).toBe(expected);
    });
  });

  describe('mixed with other handlebars', () => {
    it('should transform page counters but leave other handlebars intact', () => {
      const input = '{{reportDetails.clientName}} | Page {{pageNumber}}/{{totalPages}}';
      const expected = '{{reportDetails.clientName}} | Page <span class="paged-counter" data-counter-type="page"></span>/<span class="paged-counter" data-counter-type="pages"></span>';
      expect(transformPageCounters(input)).toBe(expected);
    });

    it('should not transform similar-looking but different handlebars', () => {
      const input = '{{pageNumberCustom}} {{totalPagesCount}}';
      expect(transformPageCounters(input)).toBe(input);
    });

    it('should handle address handlebars alongside page counters', () => {
      const input = '{{reportDetails.address}} - Page {{pageNumber}}';
      const expected = '{{reportDetails.address}} - Page <span class="paged-counter" data-counter-type="page"></span>';
      expect(transformPageCounters(input)).toBe(expected);
    });
  });

  describe('multiple occurrences', () => {
    it('should transform multiple {{pageNumber}} occurrences', () => {
      const input = '{{pageNumber}} and {{pageNumber}} again';
      const expected = '<span class="paged-counter" data-counter-type="page"></span> and <span class="paged-counter" data-counter-type="page"></span> again';
      expect(transformPageCounters(input)).toBe(expected);
    });

    it('should transform multiple {{totalPages}} occurrences', () => {
      const input = 'Total: {{totalPages}} pages ({{totalPages}})';
      const expected = 'Total: <span class="paged-counter" data-counter-type="pages"></span> pages (<span class="paged-counter" data-counter-type="pages"></span>)';
      expect(transformPageCounters(input)).toBe(expected);
    });
  });

  describe('complex HTML content', () => {
    it('should handle page counters in complex HTML structure', () => {
      const input = `
        <div id="pageMarginBottomRight" data-running-role="bottom-right">
          <p style="text-align: right">Page {{pageNumber}} of {{totalPages}}</p>
        </div>
      `;
      const result = transformPageCounters(input);
      expect(result).toContain('<span class="paged-counter" data-counter-type="page"></span>');
      expect(result).toContain('<span class="paged-counter" data-counter-type="pages"></span>');
      expect(result).toContain('<div id="pageMarginBottomRight"');
    });

    it('should handle page counters with inline styles', () => {
      const input = '<span style="font-weight: bold">{{pageNumber}}</span>';
      const expected = '<span style="font-weight: bold"><span class="paged-counter" data-counter-type="page"></span></span>';
      expect(transformPageCounters(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace variations', () => {
      const input = '{{ pageNumber }}';
      // Should NOT transform with spaces (strict matching)
      expect(transformPageCounters(input)).toBe(input);
    });

    it('should be case-sensitive', () => {
      const input = '{{PageNumber}} {{PAGENUMBER}}';
      // Should NOT transform different casing
      expect(transformPageCounters(input)).toBe(input);
    });

    it('should not transform partial matches', () => {
      const input = '{{pageNumberFormatted}} {{totalPagesWithSections}}';
      expect(transformPageCounters(input)).toBe(input);
    });
  });
});

describe('hasPageCounters', () => {
  it('should return true for {{pageNumber}}', () => {
    expect(hasPageCounters('{{pageNumber}}')).toBe(true);
  });

  it('should return true for {{totalPages}}', () => {
    expect(hasPageCounters('{{totalPages}}')).toBe(true);
  });

  it('should return true for mixed content', () => {
    expect(hasPageCounters('Page {{pageNumber}} of {{totalPages}}')).toBe(true);
  });

  it('should return false for other handlebars', () => {
    expect(hasPageCounters('{{reportDetails.clientName}}')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(hasPageCounters('')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(hasPageCounters(null as any)).toBe(false);
    expect(hasPageCounters(undefined as any)).toBe(false);
  });

  it('should return true when page counters are mixed with other content', () => {
    expect(hasPageCounters('{{reportDetails.address}} - Page {{pageNumber}}')).toBe(true);
  });
});
