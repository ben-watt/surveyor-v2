import { resolveHandlebars } from '../resolveHandlebars';
import type { BuildingSurveyFormData } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';

describe('resolveHandlebars', () => {
  const mockEditorData: BuildingSurveyFormData = {
    id: 'test-id',
    owner: {
      id: 'owner-id',
      name: 'Test Owner',
      email: 'test@example.com',
      signaturePath: [],
    },
    status: 'draft',
    reportDetails: {
      level: '3',
      reference: 'REF-123',
      clientName: 'Test Client',
      reportDate: '2024-01-15',
      inspectionDate: '2024-01-10',
      weather: 'Sunny',
      orientation: 'North',
      situation: 'Urban',
      address: {
        formatted: '123 Test Street, London, SW1A 1AA',
        line1: '123 Test Street',
        line2: 'Flat 4',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        location: {
          lat: 51.5074,
          lng: -0.1278,
        },
      },
      frontElevationImagesUri: [],
      moneyShot: [],
    },
    propertyDescription: {
      propertyType: 'Detached House',
      constructionDetails: 'Brick',
      yearOfConstruction: '1980',
      yearOfExtensions: undefined,
      yearOfConversions: undefined,
      grounds: 'Garden',
      services: 'Mains',
      otherServices: undefined,
    },
    sections: [],
    checklist: {
      items: [],
    },
  };

  describe('Basic Variable Resolution', () => {
    it('should resolve reportDetails.level', () => {
      const html = '<p>Level {{reportDetails.level}} Building Survey</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toBe('<p>Level 3 Building Survey</p>');
    });

    it('should resolve reportDetails.reference', () => {
      const html = '<p>Ref: {{reportDetails.reference}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toBe('<p>Ref: REF-123</p>');
    });

    it('should resolve reportDetails.clientName', () => {
      const html = '<p>{{reportDetails.clientName}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toBe('<p>Test Client</p>');
    });

    it('should resolve reportDetails.address.formatted', () => {
      const html = '<p>{{reportDetails.address.formatted}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toBe('<p>123 Test Street, London, SW1A 1AA</p>');
    });
  });

  describe('Page Counter Handling', () => {
    it('should preserve page counters and transform them to CSS counters', () => {
      const html = 'Page {{pageNumber}} of {{totalPages}}';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
      expect(result).toContain('data-counter-type="pages"');
      expect(result).not.toContain('{{pageNumber}}');
      expect(result).not.toContain('{{totalPages}}');
    });

    it('should resolve other handlebars while preserving page counters', () => {
      const html = 'Ref: {{reportDetails.reference}} - Page {{pageNumber}}';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('Ref: REF-123');
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
    });

    it('should handle page counter adjacent to handlebar variable in same HTML element', () => {
      // This is the specific error case: placeholder adjacent to handlebar syntax
      const html = '<p>{{totalPages}} {{reportDetails.level}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="pages"');
      expect(result).toContain('3'); // resolved level
      expect(result).not.toContain('{{totalPages}}');
      expect(result).not.toContain('{{reportDetails.level}}');
    });

    it('should handle page counter and handlebar in same paragraph with text between', () => {
      const html = '<p>Page {{pageNumber}} of {{totalPages}} - Ref: {{reportDetails.reference}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
      expect(result).toContain('data-counter-type="pages"');
      expect(result).toContain('Ref: REF-123');
      expect(result).not.toContain('{{pageNumber}}');
      expect(result).not.toContain('{{totalPages}}');
      expect(result).not.toContain('{{reportDetails.reference}}');
    });

    it('should handle multiple page counters and handlebars in complex HTML', () => {
      const html = `
        <div>
          <p>Level {{reportDetails.level}} - Page {{pageNumber}} of {{totalPages}}</p>
          <p>Ref: {{reportDetails.reference}}</p>
        </div>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('Level 3');
      expect(result).toContain('Ref: REF-123');
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
      expect(result).toContain('data-counter-type="pages"');
      expect(result).not.toContain('{{pageNumber}}');
      expect(result).not.toContain('{{totalPages}}');
    });

    it('should handle page counter at start of element followed by handlebar', () => {
      const html = '<p>{{pageNumber}} {{reportDetails.clientName}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
      expect(result).toContain('Test Client');
      expect(result).not.toContain('{{pageNumber}}');
      expect(result).not.toContain('{{reportDetails.clientName}}');
    });

    it('should handle handlebar at start followed by page counter', () => {
      const html = '<p>{{reportDetails.level}} - Page {{pageNumber}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('3');
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
      expect(result).not.toContain('{{reportDetails.level}}');
      expect(result).not.toContain('{{pageNumber}}');
    });
  });

  describe('Edge Cases', () => {
    it('should return original HTML when editorData is undefined', () => {
      const html = '<p>{{reportDetails.level}}</p>';
      const result = resolveHandlebars(html, undefined);
      expect(result).toBe(html);
    });

    it('should return original HTML when editorData is null', () => {
      const html = '<p>{{reportDetails.level}}</p>';
      const result = resolveHandlebars(html, null as any);
      expect(result).toBe(html);
    });

    it('should handle empty HTML string', () => {
      const result = resolveHandlebars('', mockEditorData);
      expect(result).toBe('');
    });

    it('should handle HTML with no handlebars', () => {
      const html = '<p>Plain text content</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toBe(html);
    });

    it('should handle invalid handlebar syntax gracefully', () => {
      const html = '<p>{{invalid.syntax.here}}</p>';
      // Should not crash, may return original or partially resolved
      const result = resolveHandlebars(html, mockEditorData);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle nested handlebars', () => {
      const html = '<p>{{reportDetails.address.line1}}, {{reportDetails.address.city}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('123 Test Street');
      expect(result).toContain('London');
    });
  });

  describe('Complex HTML Structures', () => {
    it('should resolve handlebars in complex HTML', () => {
      const html = `
        <div class="header">
          <p>Level {{reportDetails.level}} Survey</p>
          <p>Ref: {{reportDetails.reference}}</p>
          <p>{{reportDetails.address.formatted}}</p>
        </div>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('Level 3 Survey');
      expect(result).toContain('Ref: REF-123');
      expect(result).toContain('123 Test Street, London, SW1A 1AA');
    });

    it('should preserve HTML structure while resolving handlebars', () => {
      const html = '<div><p>{{reportDetails.level}}</p></div>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('<div>');
      expect(result).toContain('<p>');
      expect(result).toContain('3');
    });

    it('should handle page counters and handlebars in nested HTML structures', () => {
      const html = `
        <div id="pageMarginTopCenter" data-running-role="top-center">
          <p>Level {{reportDetails.level}} - Page {{pageNumber}} of {{totalPages}}</p>
          <p>Ref: {{reportDetails.reference}}</p>
        </div>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('Level 3');
      expect(result).toContain('Ref: REF-123');
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
      expect(result).toContain('data-counter-type="pages"');
      expect(result).toContain('id="pageMarginTopCenter"');
      expect(result).not.toContain('{{pageNumber}}');
      expect(result).not.toContain('{{totalPages}}');
    });

    it('should handle table structures with page counters and handlebars', () => {
      const html = `
        <table>
          <tr>
            <td>Page {{pageNumber}}</td>
            <td>{{reportDetails.clientName}}</td>
          </tr>
          <tr>
            <td>Total: {{totalPages}}</td>
            <td>{{reportDetails.reference}}</td>
          </tr>
        </table>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('paged-counter');
      expect(result).toContain('Test Client');
      expect(result).toContain('REF-123');
      expect(result).toContain('<table>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<td>');
    });
  });

  describe('HTML Comment Placeholder Edge Cases', () => {
    it('should not confuse HTML comment placeholders with actual HTML comments', () => {
      const html = '<p><!-- This is a real comment --> {{reportDetails.level}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('3');
      expect(result).toContain('<!-- This is a real comment -->');
    });

    it('should handle HTML that already contains comments', () => {
      const html = `
        <div>
          <!-- Header section -->
          <p>Page {{pageNumber}} - {{reportDetails.level}}</p>
          <!-- Footer section -->
        </div>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('paged-counter');
      expect(result).toContain('3');
      expect(result).toContain('<!-- Header section -->');
      expect(result).toContain('<!-- Footer section -->');
    });
  });

  describe('HTML with Inline Styles and Attributes', () => {
    it('should resolve handlebars in text content even when HTML has inline styles', () => {
      // This tests the specific error case: handlebars after inline styles
      const html = '<div style="line-height: 1.15"><p>{{reportDetails.level}}</p></div>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('3');
      expect(result).toContain('style="line-height: 1.15"');
      expect(result).not.toContain('{{reportDetails.level}}');
    });

    it('should handle wrapper divs with running element attributes and inline styles', () => {
      const html = `
        <div id="pageMarginTopCenter" data-running-role="top-center" style="position: running(pageMarginTopCenter); line-height: 1.15">
          <p>{{reportDetails.level}} - {{reportDetails.reference}}</p>
        </div>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('3');
      expect(result).toContain('REF-123');
      expect(result).toContain('id="pageMarginTopCenter"');
      expect(result).toContain('style="position: running(pageMarginTopCenter); line-height: 1.15"');
      expect(result).not.toContain('{{reportDetails.level}}');
      expect(result).not.toContain('{{reportDetails.reference}}');
    });

    it('should handle complex nested HTML with styles and handlebars', () => {
      const html = `
        <div style="line-height: 1.15">
          <div class="header-container">
            <p style="margin: 0">Level {{reportDetails.level}}</p>
            <p style="margin: 0">Ref: {{reportDetails.reference}}</p>
          </div>
        </div>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('Level 3');
      expect(result).toContain('Ref: REF-123');
      expect(result).toContain('style="line-height: 1.15"');
      expect(result).toContain('style="margin: 0"');
    });

    it('should handle page counters with inline styles in wrapper elements', () => {
      const html = `
        <div style="position: running(pageMarginBottomCenter); line-height: 1.15">
          <p>Page {{pageNumber}} of {{totalPages}} - {{reportDetails.level}}</p>
        </div>
      `;
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('paged-counter');
      expect(result).toContain('data-counter-type="page"');
      expect(result).toContain('data-counter-type="pages"');
      expect(result).toContain('3');
      expect(result).toContain('style="position: running(pageMarginBottomCenter); line-height: 1.15"');
    });
  });

  describe('Incomplete Handlebar Syntax', () => {
    it('should skip resolution when user is typing {{ (incomplete syntax)', () => {
      // This is the specific error case: user types {{ and resolution is called
      const html = '<p>{{</p>';
      const result = resolveHandlebars(html, mockEditorData);
      // Should return original HTML without crashing
      expect(result).toBe(html);
    });

    it('should skip resolution for incomplete handlebar with text', () => {
      const html = '<p>{{reportDetails</p>';
      const result = resolveHandlebars(html, mockEditorData);
      // Should return original HTML without crashing
      expect(result).toBe(html);
    });

    it('should skip resolution for multiple incomplete handlebars', () => {
      const html = '<p>{{reportDetails.level}} {{</p>';
      const result = resolveHandlebars(html, mockEditorData);
      // Should return original HTML - incomplete syntax prevents resolution
      expect(result).toBe(html);
    });

    it('should resolve complete handlebars even when there was incomplete syntax earlier', () => {
      // If user completes the handlebar, it should resolve
      const html = '<p>{{reportDetails.level}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      expect(result).toContain('3');
      expect(result).not.toContain('{{reportDetails.level}}');
    });

    it('should handle mixed complete and incomplete handlebars', () => {
      // If there's one complete and one incomplete, skip all to be safe
      const html = '<p>{{reportDetails.level}} {{</p>';
      const result = resolveHandlebars(html, mockEditorData);
      // Should return original HTML without crashing
      expect(result).toBe(html);
    });

    it('should handle malformed handlebars with extra closing braces', () => {
      const html = '<p>}} {{reportDetails.level}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      // Should return original HTML without crashing
      expect(result).toBe(html);
    });

    it('should handle nested incomplete handlebars', () => {
      const html = '<p>{{{{reportDetails.level}}</p>';
      const result = resolveHandlebars(html, mockEditorData);
      // Should return original HTML without crashing
      expect(result).toBe(html);
    });
  });
});

