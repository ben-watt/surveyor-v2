import { calculateReorderedItems } from '@/app/home/configuration/utils/dragValidation';

describe('calculateReorderedItems function', () => {
  it('should correctly reorder when moving element-3 before element-1', () => {
    const items = [
      { id: 'element-1', order: 1000 },
      { id: 'element-2', order: 2000 },
      { id: 'element-3', order: 3000 },
    ];

    const result = calculateReorderedItems(items, 'element-3', 'element-1', 'before');

    console.log('Result:', result);

    // element-3 should now be first
    expect(result).toEqual([
      { id: 'element-3', order: 1000 },
      { id: 'element-1', order: 2000 },
      { id: 'element-2', order: 3000 },
    ]);
  });

  it('should correctly reorder when moving element-1 after element-2', () => {
    const items = [
      { id: 'element-1', order: 1000 },
      { id: 'element-2', order: 2000 },
      { id: 'element-3', order: 3000 },
    ];

    const result = calculateReorderedItems(items, 'element-1', 'element-2', 'after');

    console.log('Result:', result);

    // element-1 should now be between element-2 and element-3
    expect(result).toEqual([
      { id: 'element-2', order: 1000 },
      { id: 'element-1', order: 2000 },
      { id: 'element-3', order: 3000 },
    ]);
  });

  it('should correctly reorder when moving element-2 after element-3', () => {
    const items = [
      { id: 'element-1', order: 1000 },
      { id: 'element-2', order: 2000 },
      { id: 'element-3', order: 3000 },
    ];

    const result = calculateReorderedItems(items, 'element-2', 'element-3', 'after');

    console.log('Result:', result);

    // element-2 should now be last
    expect(result).toEqual([
      { id: 'element-1', order: 1000 },
      { id: 'element-3', order: 2000 },
      { id: 'element-2', order: 3000 },
    ]);
  });
});
