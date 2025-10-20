import {
  mapRagToColor,
  fallback,
  formatList,
  getNestedValue,
  formatCurrency,
  truncateText,
  isEmpty,
  pluralize,
  toTitleCase,
  clamp,
  unique,
  groupBy,
} from '../utils';

describe('Building Survey Report Utilities', () => {
  describe('mapRagToColor', () => {
    it('should map Green to green', () => {
      expect(mapRagToColor('Green')).toBe('green');
    });

    it('should map Amber to orange', () => {
      expect(mapRagToColor('Amber')).toBe('orange');
    });

    it('should map Red to red', () => {
      expect(mapRagToColor('Red')).toBe('red');
    });

    it('should map N/I to white', () => {
      expect(mapRagToColor('N/I')).toBe('white');
    });

    it('should return white for invalid status', () => {
      // @ts-expect-error - testing invalid input
      expect(mapRagToColor('Invalid')).toBe('white');
    });

    it('should handle case sensitivity', () => {
      // Should use exact match from RAG_COLORS
      expect(mapRagToColor('Green')).toBe('green');
      // @ts-expect-error - testing different case
      expect(mapRagToColor('green')).toBe('white');
    });
  });

  describe('fallback', () => {
    describe('with undefined/null values', () => {
      it('should return fallback for undefined', () => {
        expect(fallback(undefined, 'default')).toBe('default');
      });

      it('should return fallback for null', () => {
        expect(fallback(null, 'default')).toBe('default');
      });
    });

    describe('with string values', () => {
      it('should return value for non-empty string', () => {
        expect(fallback('hello', 'default')).toBe('hello');
      });

      it('should return fallback for empty string', () => {
        expect(fallback('', 'default')).toBe('default');
      });

      it('should preserve whitespace in non-empty strings', () => {
        expect(fallback('  spaces  ', 'default')).toBe('  spaces  ');
      });
    });

    describe('with number values', () => {
      it('should return value for positive numbers', () => {
        expect(fallback(42, 999)).toBe(42);
      });

      it('should return value for negative numbers', () => {
        expect(fallback(-5, 999)).toBe(-5);
      });

      it('should return 0 (not fallback) for zero', () => {
        expect(fallback(0, 999)).toBe(0);
      });

      it('should return value for decimal numbers', () => {
        expect(fallback(3.14, 999)).toBe(3.14);
      });
    });

    describe('with boolean values', () => {
      it('should return true', () => {
        expect(fallback(true, false)).toBe(true);
      });

      it('should return false (not fallback)', () => {
        expect(fallback(false, true)).toBe(false);
      });
    });

    describe('with complex types', () => {
      it('should handle arrays', () => {
        const arr = [1, 2, 3];
        const fallbackArr: number[] = [];
        expect(fallback(arr, fallbackArr)).toBe(arr);
      });

      it('should handle objects', () => {
        const obj = { key: 'value' };
        const fallbackObj = { key: 'default' };
        expect(fallback(obj, fallbackObj)).toBe(obj);
      });
    });
  });

  describe('formatList', () => {
    it('should return empty string for empty array', () => {
      expect(formatList([])).toBe('');
    });

    it('should return single item as-is', () => {
      expect(formatList(['A'])).toBe('A');
    });

    it('should join two items with default separator', () => {
      expect(formatList(['A', 'B'])).toBe('A & B');
    });

    it('should format three items correctly', () => {
      expect(formatList(['A', 'B', 'C'])).toBe('A, B & C');
    });

    it('should format many items correctly', () => {
      expect(formatList(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C, D & E');
    });

    it('should use custom separator', () => {
      expect(formatList(['A', 'B', 'C'], ' or ')).toBe('A, B or C');
    });

    it('should use custom comma separator', () => {
      expect(formatList(['A', 'B', 'C'], ' and ', '; ')).toBe('A; B and C');
    });

    it('should handle number arrays', () => {
      expect(formatList([1, 2, 3])).toBe('1, 2 & 3');
    });

    it('should convert items to strings', () => {
      expect(formatList([true, false, null])).toBe('true, false & null');
    });
  });

  describe('getNestedValue', () => {
    const testObj = {
      user: {
        name: 'John',
        address: {
          city: 'London',
          postcode: 'SW1A 1AA',
        },
      },
      items: ['a', 'b', 'c'],
    };

    it('should access top-level properties', () => {
      expect(getNestedValue(testObj, 'items')).toEqual(['a', 'b', 'c']);
    });

    it('should access nested properties', () => {
      expect(getNestedValue(testObj, 'user.name')).toBe('John');
    });

    it('should access deeply nested properties', () => {
      expect(getNestedValue(testObj, 'user.address.city')).toBe('London');
    });

    it('should return fallback for non-existent path', () => {
      expect(getNestedValue(testObj, 'user.age', 25)).toBe(25);
    });

    it('should return undefined for non-existent path without fallback', () => {
      expect(getNestedValue(testObj, 'user.age')).toBeUndefined();
    });

    it('should handle null/undefined intermediate values', () => {
      expect(getNestedValue({ a: null }, 'a.b.c', 'default')).toBe('default');
    });

    it('should handle empty path', () => {
      expect(getNestedValue(testObj, '')).toBe(testObj);
    });
  });

  describe('formatCurrency', () => {
    it('should format whole numbers without pence', () => {
      expect(formatCurrency(1500)).toBe('£1,500');
    });

    it('should format large numbers with commas', () => {
      expect(formatCurrency(1000000)).toBe('£1,000,000');
    });

    it('should include pence when requested', () => {
      expect(formatCurrency(1500.5, true)).toBe('£1,500.50');
    });

    it('should round to nearest penny', () => {
      expect(formatCurrency(1500.567, true)).toBe('£1,500.57');
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('£0');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-500)).toBe('-£500');
    });

    it('should format small amounts', () => {
      expect(formatCurrency(5, true)).toBe('£5.00');
    });
  });

  describe('truncateText', () => {
    it('should not truncate text shorter than max length', () => {
      expect(truncateText('Short', 10)).toBe('Short');
    });

    it('should truncate text longer than max length', () => {
      const result = truncateText('This is a long text', 10);
      expect(result).toBe('This is...');
      expect(result.length).toBe(10); // Total length should not exceed maxLength
    });

    it('should use custom suffix', () => {
      expect(truncateText('This is a long text', 10, '…')).toBe('This is a…');
    });

    it('should handle exact length match', () => {
      expect(truncateText('Exactly10!', 10)).toBe('Exactly10!');
    });

    it('should account for suffix length', () => {
      const result = truncateText('This is a long text', 10, '...');
      expect(result.length).toBe(10);
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(isEmpty('   ')).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('text')).toBe(false);
    });

    it('should return false for non-empty array', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it('should return false for non-empty object', () => {
      expect(isEmpty({ key: 'value' })).toBe(false);
    });

    it('should return false for zero', () => {
      expect(isEmpty(0)).toBe(false);
    });

    it('should return false for false boolean', () => {
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('pluralize', () => {
    it('should use singular for count of 1', () => {
      expect(pluralize(1, 'item')).toBe('1 item');
    });

    it('should use plural for count of 0', () => {
      expect(pluralize(0, 'item')).toBe('0 items');
    });

    it('should use plural for count > 1', () => {
      expect(pluralize(5, 'item')).toBe('5 items');
    });

    it('should use custom plural form', () => {
      expect(pluralize(2, 'property', 'properties')).toBe('2 properties');
    });

    it('should handle irregular plurals', () => {
      expect(pluralize(3, 'child', 'children')).toBe('3 children');
    });

    it('should default to adding s for plural', () => {
      expect(pluralize(2, 'house')).toBe('2 houses');
    });
  });

  describe('toTitleCase', () => {
    it('should capitalize first letter of each word', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
    });

    it('should handle already title-cased text', () => {
      expect(toTitleCase('Hello World')).toBe('Hello World');
    });

    it('should handle all caps', () => {
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });

    it('should handle multiple spaces', () => {
      expect(toTitleCase('hello  world')).toBe('Hello  World');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });
  });

  describe('clamp', () => {
    it('should return value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min if value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max if value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle value equal to min', () => {
      expect(clamp(0, 0, 10)).toBe(0);
    });

    it('should handle value equal to max', () => {
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
    });

    it('should handle decimal values', () => {
      expect(clamp(3.5, 0, 10)).toBe(3.5);
    });
  });

  describe('unique', () => {
    it('should remove duplicate numbers', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('should remove duplicate strings', () => {
      expect(unique(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      expect(unique([])).toEqual([]);
    });

    it('should handle array with no duplicates', () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should preserve order of first occurrence', () => {
      expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
    });

    it('should handle single item array', () => {
      expect(unique([1])).toEqual([1]);
    });
  });

  describe('groupBy', () => {
    const items = [
      { type: 'A', value: 1 },
      { type: 'B', value: 2 },
      { type: 'A', value: 3 },
      { type: 'C', value: 4 },
      { type: 'B', value: 5 },
    ];

    it('should group items by key', () => {
      const result = groupBy(items, 'type');

      expect(result['A']).toHaveLength(2);
      expect(result['B']).toHaveLength(2);
      expect(result['C']).toHaveLength(1);
    });

    it('should preserve item properties', () => {
      const result = groupBy(items, 'type');

      expect(result['A'][0]).toEqual({ type: 'A', value: 1 });
      expect(result['A'][1]).toEqual({ type: 'A', value: 3 });
    });

    it('should handle empty array', () => {
      expect(groupBy([], 'type')).toEqual({});
    });

    it('should handle single item', () => {
      const single = [{ type: 'A', value: 1 }];
      const result = groupBy(single, 'type');

      expect(result['A']).toEqual([{ type: 'A', value: 1 }]);
    });

    it('should handle all items in same group', () => {
      const sameType = [
        { type: 'A', value: 1 },
        { type: 'A', value: 2 },
        { type: 'A', value: 3 },
      ];
      const result = groupBy(sameType, 'type');

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['A']).toHaveLength(3);
    });

    it('should work with numeric keys', () => {
      const numericItems = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' },
      ];
      const result = groupBy(numericItems, 'id');

      expect(result['1']).toHaveLength(2);
      expect(result['2']).toHaveLength(1);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle chained utility functions', () => {
      const items = [1, 2, 2, 3, 3, 3];
      const uniqueItems = unique(items);
      const formatted = formatList(uniqueItems);

      expect(formatted).toBe('1, 2 & 3');
    });

    it('should handle fallback with nested value extraction', () => {
      const obj = { user: { name: null } };
      const name = getNestedValue(obj, 'user.name');
      const safeName = fallback(name, 'Unknown');

      expect(safeName).toBe('Unknown');
    });

    it('should compose isEmpty with fallback', () => {
      const emptyValue = '';
      const result = isEmpty(emptyValue) ? fallback(undefined, 'N/A') : emptyValue;

      expect(result).toBe('N/A');
    });
  });
});

