import { parseDataHierarchy } from '@/app/home/components/TipTapExtensions/tocUtils';

type TocDataItem = {
  originalLevel: number;
  level: number;
  textContent: string;
  id: string;
  pos: number;
  itemIndex: number;
};

describe('parseDataHierarchy', () => {
  it('handles double drop in depth (H1 -> H3) by inserting 0 for missing level', () => {
    const data: TocDataItem[] = [
      {
        originalLevel: 1,
        level: 1,
        textContent: 'Heading 1',
        id: 'h1',
        pos: 0,
        itemIndex: 1,
      },
      {
        originalLevel: 3,
        level: 3,
        textContent: 'Heading 3',
        id: 'h3',
        pos: 10,
        itemIndex: 1,
      },
    ];

    const result = parseDataHierarchy(data);

    expect(result[0].hierarchyText).toBe('1.0');
    expect(result[1].hierarchyText).toBe('1.0.1');
  });

  it('resets correctly when going up in depth (H3 -> H2)', () => {
    const data: TocDataItem[] = [
      {
        originalLevel: 1,
        level: 1,
        textContent: 'Heading 1',
        id: 'h1',
        pos: 0,
        itemIndex: 1,
      },
      {
        originalLevel: 3,
        level: 3,
        textContent: 'Heading 3',
        id: 'h3',
        pos: 10,
        itemIndex: 1,
      },
      {
        originalLevel: 2,
        level: 2,
        textContent: 'Heading 2',
        id: 'h2',
        pos: 20,
        itemIndex: 2,
      },
    ];

    const result = parseDataHierarchy(data);

    expect(result[0].hierarchyText).toBe('1.0');
    expect(result[1].hierarchyText).toBe('1.0.1');
    expect(result[2].hierarchyText).toBe('1.2');
  });
});
