import React from 'react';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ConditionsList from '@/app/home/surveys/[id]/condition/ConditionsList';

describe('ConditionsList UI', () => {
  test('shows red outline and warning icon when unresolved', () => {
    const conditions: any[] = [
      {
        id: 'c1',
        name: 'C1',
        phrase: '',
        doc: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'inlineSelect', attrs: { key: 'k', options: ['a','b'] } }] },
          ],
        },
      },
    ];

    render(
      <ConditionsList
        conditions={conditions as any}
        onEdit={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onRemove={() => {}}
      />,
    );

    const nameEl = screen.getByText('C1');
    const item = nameEl.closest('div')?.parentElement?.parentElement as HTMLElement;
    expect(item).toHaveClass('border-red-500');
    expect(screen.getByLabelText('Condition needs selection')).toBeInTheDocument();
  });

  test('shows overflow menu on small screens while up/down stay visible', async () => {
    const conditions: any[] = [
      { id: 'c1', name: 'C1', phrase: 'ok' },
    ];

    render(
      <div className="max-w-xs">
        <ConditionsList
          conditions={conditions as any}
          onEdit={() => {}}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
          onRemove={() => {}}
        />
      </div>,
    );

    // Up/Down buttons always present
    expect(screen.getByLabelText('Move condition up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move condition down')).toBeInTheDocument();

    // Overflow trigger visible (icon button)
    const user = userEvent.setup();
    const more = screen.getByLabelText('More actions');
    await user.click(more);
    expect(await screen.findByText('Edit')).toBeInTheDocument();
    expect(await screen.findByText('Remove')).toBeInTheDocument();
  });
});


