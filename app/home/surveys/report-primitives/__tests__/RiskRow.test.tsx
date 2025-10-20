/**
 * Tests for RiskRow component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RiskRow } from '../components/RiskRow';

describe('RiskRow', () => {
  it('should render risk title', () => {
    const { getByText } = render(
      <RiskRow id="test-risk" risk="Test Risk" description="Test description" />
    );
    expect(getByText('Test Risk')).toBeInTheDocument();
  });

  it('should render risk description', () => {
    const { getByText } = render(
      <RiskRow id="test-risk" risk="Test Risk" description="Test description" />
    );
    expect(getByText('Test description')).toBeInTheDocument();
  });

  it('should render with correct id', () => {
    const { container } = render(
      <RiskRow id="timber-rot" risk="Timber Rot" description="Description" />
    );
    const element = container.querySelector('#timber-rot');
    expect(element).toBeInTheDocument();
  });

  it('should add TOC data attribute', () => {
    const { container } = render(
      <RiskRow id="test-risk" risk="Test Risk" description="Test description" />
    );
    const h3 = container.querySelector('[data-add-toc-here-id="test-risk"]');
    expect(h3).toBeInTheDocument();
  });

  it('should render in a table', () => {
    const { container } = render(
      <RiskRow id="test-risk" risk="Test Risk" description="Test description" />
    );
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
  });

  it('should have 4 columns', () => {
    const { container } = render(
      <RiskRow id="test-risk" risk="Test Risk" description="Test description" />
    );
    const cells = container.querySelectorAll('td');
    expect(cells).toHaveLength(4);
  });

  it('should apply default justified style to description', () => {
    const { container } = render(
      <RiskRow id="test-risk" risk="Test Risk" description="Test description" />
    );
    const descriptionCell = container.querySelectorAll('td')[2];
    const p = descriptionCell.querySelector('p');
    expect(p).toHaveStyle({ textAlign: 'justify' });
  });

  it('should accept custom report styles', () => {
    const customStyles = {
      justified: { textAlign: 'left' as const, color: 'blue' },
    };
    const { container } = render(
      <RiskRow
        id="test-risk"
        risk="Test Risk"
        description="Test description"
        reportStyles={customStyles}
      />
    );
    const descriptionCell = container.querySelectorAll('td')[2];
    const p = descriptionCell.querySelector('p');
    expect(p).toHaveStyle({
      textAlign: 'left',
      color: 'blue',
    });
  });

  it('should handle missing description', () => {
    const { container } = render(<RiskRow id="test-risk" risk="Test Risk" />);
    const descriptionCell = container.querySelectorAll('td')[2];
    const p = descriptionCell.querySelector('p');
    expect(p?.textContent).toBe('');
  });

  it('should render h3 for risk title', () => {
    const { container } = render(
      <RiskRow id="test-risk" risk="Test Risk" description="Test description" />
    );
    const h3 = container.querySelector('h3');
    expect(h3).toBeInTheDocument();
    expect(h3?.textContent).toBe('Test Risk');
  });
});

