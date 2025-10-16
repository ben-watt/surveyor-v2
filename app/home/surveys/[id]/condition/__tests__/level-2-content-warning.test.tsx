import '@testing-library/jest-dom';
import { render, screen } from '@/test-utils';
import ConditionsList from '../ConditionsList';
import { isMissingLevel2Content } from '@/lib/conditions/validator';

describe('ConditionsList - Level 2 Content Warnings', () => {
  const mockHandlers = {
    onEdit: jest.fn(),
    onMoveUp: jest.fn(),
    onMoveDown: jest.fn(),
    onRemove: jest.fn(),
  };

  test('shows "Missing Level 2 content" warning for Level 2 survey when phraseLevel2 is empty', () => {
    const conditions = [
      {
        id: 'cond1',
        name: 'Test Condition',
        phrase: 'Level 3 text',
        phraseLevel2: '', // Empty Level 2 content
      },
    ];

    render(
      <ConditionsList
        conditions={conditions as any}
        surveyLevel="2"
        isUnresolved={() => true} // Flagged as unresolved
        {...mockHandlers}
      />,
    );

    expect(screen.getByText('Test Condition')).toBeInTheDocument();
    // The tooltip should show "Missing Level 2 content"
    const alertIcon = screen.getByLabelText('Missing Level 2 content');
    expect(alertIcon).toBeInTheDocument();
  });

  test('shows "Needs selection" warning for unresolved inline selections', () => {
    const conditions = [
      {
        id: 'cond1',
        name: 'Test Condition',
        phrase: 'Level 3 text',
        phraseLevel2: 'Level 2 text', // Has Level 2 content
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'inlineSelect', attrs: { key: 'state', options: ['Good', 'Poor'] } }, // No value
              ],
            },
          ],
        },
      },
    ];

    render(
      <ConditionsList
        conditions={conditions as any}
        surveyLevel="2"
        isUnresolved={() => true}
        {...mockHandlers}
      />,
    );

    const alertIcon = screen.getByLabelText('Needs selection');
    expect(alertIcon).toBeInTheDocument();
  });

  test('shows combined warning when both issues exist', () => {
    const conditions = [
      {
        id: 'cond1',
        name: 'Test Condition',
        phrase: 'Level 3 text',
        phraseLevel2: '', // Missing Level 2 content
        docLevel2: {
          // Level 2 doc with unresolved selection
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'inlineSelect', attrs: { key: 'state', options: ['Good', 'Poor'] } }, // No value
              ],
            },
          ],
        },
      },
    ];

    render(
      <ConditionsList
        conditions={conditions as any}
        surveyLevel="2"
        isUnresolved={() => true}
        {...mockHandlers}
      />,
    );

    const alertIcon = screen.getByLabelText('Needs selection & missing Level 2 content');
    expect(alertIcon).toBeInTheDocument();
  });

  test('does not show Level 2 warning for Level 3 surveys', () => {
    const conditions = [
      {
        id: 'cond1',
        name: 'Test Condition',
        phrase: 'Level 3 text',
        phraseLevel2: '', // Empty Level 2 content, but that's OK for Level 3
      },
    ];

    render(
      <ConditionsList
        conditions={conditions as any}
        surveyLevel="3"
        isUnresolved={() => false} // Not flagged because Level 3 doesn't care about Level 2
        {...mockHandlers}
      />,
    );

    expect(screen.getByText('Test Condition')).toBeInTheDocument();
    // Should not have any warning icon
    const alertIcons = screen.queryByLabelText(/Missing Level 2 content/);
    expect(alertIcons).not.toBeInTheDocument();
  });

  test('does not show warning when condition has valid Level 2 content', () => {
    const conditions = [
      {
        id: 'cond1',
        name: 'Test Condition',
        phrase: 'Level 3 text',
        phraseLevel2: 'Level 2 text', // Has Level 2 content
      },
    ];

    render(
      <ConditionsList
        conditions={conditions as any}
        surveyLevel="2"
        isUnresolved={() => false} // Not flagged because has Level 2 content
        {...mockHandlers}
      />,
    );

    expect(screen.getByText('Test Condition')).toBeInTheDocument();
    // Should not have any warning icon
    const alertIcons = screen.queryByLabelText(/Missing Level 2 content/);
    expect(alertIcons).not.toBeInTheDocument();
  });

  test('isMissingLevel2Content correctly identifies conditions needing Level 2 content', () => {
    const withLevel2 = { phraseLevel2: 'Level 2 text' };
    const withoutLevel2 = { phraseLevel2: '' };
    const undefinedLevel2 = {};

    expect(isMissingLevel2Content(withLevel2)).toBe(false);
    expect(isMissingLevel2Content(withoutLevel2)).toBe(true);
    expect(isMissingLevel2Content(undefinedLevel2)).toBe(true);
  });
});

