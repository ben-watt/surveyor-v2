import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock router to avoid navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import { ConfigTreeNode } from '../components/ConfigTreeNode';

const baseNode = {
  id: 'n1',
  type: 'section' as const,
  name: '(Untitled Section)',
  data: { id: 's1' } as any,
  children: [],
  isExpanded: false,
  invalid: true,
};

describe('ConfigTreeNode invalid badge', () => {
  it('shows Missing name badge when node.invalid is true', () => {
    render(
      <ConfigTreeNode
        node={baseNode}
        onToggleExpand={() => {}}
        level={0}
        lastEditedEntity={null}
      />
    );

    expect(screen.getByText('Missing name')).toBeInTheDocument();
  });
});

