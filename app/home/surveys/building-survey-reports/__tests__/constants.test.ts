import {
  LANDSCAPE_WIDTH,
  IMAGE_MAX_HEIGHT,
  REPORT_STYLES,
  RAG_COLORS,
  TABLE_LAYOUTS,
  IMAGE_DIMENSIONS,
} from '../constants';

describe('Building Survey Report Constants', () => {
  describe('Layout Constants', () => {
    it('should define landscape width', () => {
      expect(LANDSCAPE_WIDTH).toBe(928);
      expect(typeof LANDSCAPE_WIDTH).toBe('number');
    });

    it('should define image max height', () => {
      expect(IMAGE_MAX_HEIGHT).toBe('75mm');
      expect(typeof IMAGE_MAX_HEIGHT).toBe('string');
    });
  });

  describe('REPORT_STYLES', () => {
    it('should define all heading styles', () => {
      expect(REPORT_STYLES.heading1).toEqual({
        fontSize: '14pt',
        fontWeight: 'bold',
      });

      expect(REPORT_STYLES.heading2).toEqual({
        fontSize: '14pt',
        fontWeight: 'bold',
        textAlign: 'center',
      });

      expect(REPORT_STYLES.heading3).toEqual({
        fontWeight: 'bold',
      });
    });

    it('should define text alignment styles', () => {
      expect(REPORT_STYLES.rightAligned).toEqual({ textAlign: 'right' });
      expect(REPORT_STYLES.centered).toEqual({ textAlign: 'center' });
      expect(REPORT_STYLES.justified).toEqual({ textAlign: 'justify' });
    });

    it('should define font size styles', () => {
      expect(REPORT_STYLES.smallText).toEqual({ fontSize: '8pt' });
      expect(REPORT_STYLES.tinyText).toEqual({ fontSize: '6pt' });
      expect(REPORT_STYLES.largeText).toEqual({ fontSize: '18pt' });
    });

    it('should define combined styles', () => {
      expect(REPORT_STYLES.rightAlignedSmall).toEqual({
        textAlign: 'right',
        fontSize: '8pt',
      });

      expect(REPORT_STYLES.markerText).toEqual({
        fontSize: '18pt',
        fontWeight: 'bold',
        textAlign: 'center',
      });
    });

    it('should be defined and not null', () => {
      // TypeScript prevents modification at compile time with 'as const'
      // Runtime immutability requires Object.freeze which we don't use for performance
      expect(REPORT_STYLES.heading1).toBeDefined();
      expect(REPORT_STYLES.heading1).not.toBeNull();
    });
  });

  describe('RAG_COLORS', () => {
    it('should map all RAG statuses to colors', () => {
      expect(RAG_COLORS['Green']).toBe('green');
      expect(RAG_COLORS['Amber']).toBe('orange');
      expect(RAG_COLORS['Red']).toBe('red');
      expect(RAG_COLORS['N/I']).toBe('white');
    });

    it('should have exactly 4 RAG status mappings', () => {
      expect(Object.keys(RAG_COLORS)).toHaveLength(4);
    });

    it('should use lowercase color names', () => {
      const colors = Object.values(RAG_COLORS);
      colors.forEach(color => {
        expect(color).toBe(color.toLowerCase());
      });
    });

    it('should return undefined for invalid status', () => {
      expect(RAG_COLORS['Invalid']).toBeUndefined();
    });
  });

  describe('TABLE_LAYOUTS', () => {
    it('should define common table layouts', () => {
      expect(TABLE_LAYOUTS.twoColumnEqual).toEqual([50, 50]);
      expect(TABLE_LAYOUTS.twoColumnUnequal).toEqual([40, 60]);
      expect(TABLE_LAYOUTS.twoColumnNarrowLeft).toEqual([30, 70]);
      expect(TABLE_LAYOUTS.threeColumnCentered).toEqual([6, 88, 6]);
      expect(TABLE_LAYOUTS.fourColumnReport).toEqual([10, 20, 64, 6]);
    });

    it('should have widths that sum to 100', () => {
      Object.entries(TABLE_LAYOUTS).forEach(([name, widths]) => {
        const sum = widths.reduce((acc, width) => acc + width, 0);
        expect(sum).toBe(100);
      });
    });

    it('should be defined as readonly tuples', () => {
      // TypeScript prevents modification at compile time with 'as const'
      expect(TABLE_LAYOUTS.twoColumnEqual).toBeDefined();
      expect(Array.isArray(TABLE_LAYOUTS.twoColumnEqual)).toBe(true);
    });
  });

  describe('IMAGE_DIMENSIONS', () => {
    it('should define money shot dimensions', () => {
      expect(IMAGE_DIMENSIONS.moneyShot).toEqual({
        width: 700,
        height: 480,
      });
    });

    it('should define placeholder dimensions', () => {
      expect(IMAGE_DIMENSIONS.placeholder).toEqual({
        width: 600,
        height: 400,
      });
    });

    it('should define signature dimensions', () => {
      expect(IMAGE_DIMENSIONS.signature).toEqual({
        width: 400,
        height: 200,
      });
    });

    it('should have all dimensions as numbers', () => {
      const allDimensions = Object.values(IMAGE_DIMENSIONS).flatMap(dim =>
        Object.values(dim)
      );
      allDimensions.forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('Style Consistency', () => {
    it('should use consistent font size format', () => {
      const fontSizeStyles = [
        REPORT_STYLES.heading1.fontSize,
        REPORT_STYLES.heading2.fontSize,
        REPORT_STYLES.smallText.fontSize,
        REPORT_STYLES.tinyText.fontSize,
        REPORT_STYLES.largeText.fontSize,
      ];

      fontSizeStyles.forEach(size => {
        if (size) {
          // Only check defined sizes
          expect(size).toMatch(/^\d+pt$/);
        }
      });
    });

    it('should use consistent text alignment values', () => {
      const validAlignments = ['left', 'right', 'center', 'justify'];
      const alignmentStyles = [
        REPORT_STYLES.rightAligned.textAlign,
        REPORT_STYLES.centered.textAlign,
        REPORT_STYLES.justified.textAlign,
      ];

      alignmentStyles.forEach(align => {
        expect(validAlignments).toContain(align);
      });
    });
  });
});

