export interface TocDataItem {
  originalLevel: number;
  level: number;
  textContent: string;
  id: string;
  pos: number;
  itemIndex: number;
}

export interface TableOfContentsDataItemWithHierarchy {
  item: TocDataItem;
  hierarchyText: string;
}

export function appendZeroToHierarchyText(text: string): string {
  if (text.includes('.')) {
    return text;
  }
  return text + '.0';
}

export function parseDataHierarchy(
  data: TocDataItem[]
): TableOfContentsDataItemWithHierarchy[] {
  const stack: number[] = [];
  return data.map((item, index, array) => {
    const previousItem = array[index - 1];
    // Down the hierarchy
    if (previousItem && previousItem.originalLevel < item.originalLevel) {
      const levelsToPush = item.originalLevel - previousItem.originalLevel;
      for (let i = 0; i < levelsToPush; i++) {
        if (i === 0) {
          // keep the parent index
          stack.push(previousItem.itemIndex);
        } else {
          // fill missing intermediate levels with 0 (e.g., H1 -> H3 becomes 1.0.x)
          stack.push(0);
        }
      }
    }

    // Up the hierarchy
    if (previousItem && previousItem.originalLevel > item.originalLevel) {
      const levelsToPop = previousItem.originalLevel - item.originalLevel;
      for (let i = 0; i < levelsToPop; i++) {
        stack.pop();
      }
    }

    stack.push(item.itemIndex);
    const text = stack.join('.');
    stack.pop();
    return {
      item,
      hierarchyText: appendZeroToHierarchyText(text),
    };
  });
}


