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
  });
});

