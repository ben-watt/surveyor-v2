/**
 * @jest-environment jsdom
 */
import {
  normalizeRunningHtmlForZone,
  MARGIN_ZONE_METADATA,
} from '../HeaderFooterEditor';
import type { MarginZone } from '../marginZones';

describe('HeaderFooterEditor normalization', () => {
  describe('normalizeRunningHtmlForZone', () => {
    it('should normalize header HTML with zone-specific attributes', () => {
      const headerHtml = `
        <div class="header-container">
          <div class="headerPrimary" data-running-role="top-center">
            <p>Header content</p>
          </div>
        </div>
      `;

      const normalized = normalizeRunningHtmlForZone('topCenter', headerHtml);

      expect(normalized).toContain('data-running-role="top-center"');
      expect(normalized).toContain('id="pageMarginTopCenter"');
      expect(normalized).toContain('position: running(pageMarginTopCenter)');
    });

    it('should normalize footer HTML with zone-specific attributes', () => {
      const footerHtml = `
        <div class="footer-container">
          <div class="footerPrimary" data-running-role="bottom-center">
            <p>Footer content</p>
          </div>
        </div>
      `;

      const normalized = normalizeRunningHtmlForZone('bottomCenter', footerHtml);

      expect(normalized).toContain('data-running-role="bottom-center"');
      expect(normalized).toContain('id="pageMarginBottomCenter"');
      expect(normalized).toContain('position: running(pageMarginBottomCenter)');
    });

    it('should extract and normalize address block from header with zone-specific attributes', () => {
      const headerWithAddress = `
        <div class="header-container">
          <table>
            <tr>
              <td>
                <div class="headerPrimary" data-running-role="top-center">
                  <p>Header content</p>
                </div>
              </td>
              <td>
                <div class="headerAddress" data-running-role="top-right">
                  <p>Address content</p>
                </div>
              </td>
            </tr>
          </table>
        </div>
      `;

      const normalized = normalizeRunningHtmlForZone('topCenter', headerWithAddress);

      // Should normalize header region
      expect(normalized).toContain('data-running-role="top-center"');
      expect(normalized).toContain('id="pageMarginTopCenter"');

      // Address block should also be present with correct attributes
      const parser = new DOMParser();
      const doc = parser.parseFromString(normalized, 'text/html');
      const addressRegion = doc.querySelector('[data-running-role="top-right"]');
      expect(addressRegion).toBeTruthy();
      expect(addressRegion?.getAttribute('id')).toBe('pageMarginTopRight');
    });

    it('should normalize zone-specific attributes correctly', () => {
      const zoneSpecificHtml = `
        <div id="pageMarginTopLeft" data-running-role="top-left">
          <p>Top left content</p>
        </div>
      `;

      const normalized = normalizeRunningHtmlForZone('topLeft', zoneSpecificHtml);

      expect(normalized).toContain('data-running-role="top-left"');
      expect(normalized).toContain('id="pageMarginTopLeft"');
      expect(normalized).toContain('position: running(pageMarginTopLeft)');
    });

    it('should ensure running attributes are set for all zones', () => {
      const zones: MarginZone[] = [
        'topLeft',
        'topCenter',
        'topRight',
        'bottomCenter',
        'bottomRight',
      ];

      zones.forEach((zone) => {
        const meta = MARGIN_ZONE_METADATA[zone];
        const html = `<div><p>Content for ${zone}</p></div>`;
        const normalized = normalizeRunningHtmlForZone(zone, html);

        expect(normalized).toContain(`data-running-role="${meta.dataRole}"`);
        expect(normalized).toContain(`id="${meta.runningName}"`);
        expect(normalized).toContain(`position: running(${meta.runningName})`);
      });
    });

    it('should preserve table structure in header normalization', () => {
      const headerWithTable = `
        <div class="header-container">
          <table class="header-table">
            <tr>
              <td>Left</td>
              <td>Right</td>
            </tr>
          </table>
        </div>
      `;

      const normalized = normalizeRunningHtmlForZone('topCenter', headerWithTable);

      expect(normalized).toContain('<table');
      expect(normalized).toContain('class="header-table"');
      expect(normalized).toContain('border-collapse: collapse');
    });

    it('should handle empty or missing HTML gracefully', () => {
      const normalized = normalizeRunningHtmlForZone('topCenter', '');

      // Should return a valid structure even for empty input
      expect(normalized).toBeTruthy();
      expect(typeof normalized).toBe('string');
    });

    it('should ensure id attribute matches running name', () => {
      const html = '<div data-running-role="top-center"><p>Test</p></div>';
      const normalized = normalizeRunningHtmlForZone('topCenter', html);

      const parser = new DOMParser();
      const doc = parser.parseFromString(normalized, 'text/html');
      const element = doc.querySelector('[data-running-role="top-center"]');

      expect(element?.getAttribute('id')).toBe('pageMarginTopCenter');
      expect(element?.getAttribute('style')).toContain('position: running(pageMarginTopCenter)');
    });
  });
});

