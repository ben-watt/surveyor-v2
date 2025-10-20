/**
 * Tests for Heading component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Heading } from '../components/Heading';

describe('Heading', () => {
  it('should render h2 by default', () => {
    const { container } = render(<Heading>Test Heading</Heading>);
    const h2 = container.querySelector('h2');
    expect(h2).toBeInTheDocument();
    expect(h2?.textContent).toBe('Test Heading');
  });

  it('should render h1 when level is h1', () => {
    const { container } = render(<Heading level="h1">Test Heading</Heading>);
    const h1 = container.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toBe('Test Heading');
  });

  it('should apply id attribute', () => {
    const { container } = render(<Heading id="section-1">Section 1</Heading>);
    const heading = container.querySelector('#section-1');
    expect(heading).toBeInTheDocument();
  });

  it('should apply base styles', () => {
    const { container } = render(<Heading>Test</Heading>);
    const h2 = container.querySelector('h2');
    expect(h2).toHaveStyle({
      fontWeight: 'bold',
      fontSize: '14pt',
    });
  });

  it('should apply centered style when centered is true', () => {
    const { container } = render(<Heading centered>Test</Heading>);
    const h2 = container.querySelector('h2');
    expect(h2).toHaveStyle({
      textAlign: 'center',
    });
  });

  it('should render with TableBlock when centered', () => {
    const { container } = render(
      <Heading id="test" centered>
        Centered Heading
      </Heading>
    );
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
  });

  it('should add TOC data attribute when id is provided and centered', () => {
    const { container } = render(
      <Heading id="section-1" centered>
        Section 1
      </Heading>
    );
    const h2 = container.querySelector('[data-add-toc-here-id="section-1"]');
    expect(h2).toBeInTheDocument();
  });

  it('should not render TOC anchor when id is not provided but centered', () => {
    const { container } = render(<Heading centered>No ID Heading</Heading>);
    const p = container.querySelector('p');
    expect(p?.id).toBe('');
  });

  it('should accept custom styles', () => {
    const { container } = render(
      <Heading style={{ color: 'red', margin: '10px' }}>Custom Style</Heading>
    );
    const h2 = container.querySelector('h2');
    expect(h2).toHaveStyle({
      color: 'red',
      margin: '10px',
    });
  });

  it('should merge custom styles with base styles', () => {
    const { container } = render(
      <Heading style={{ color: 'blue' }}>Merged Style</Heading>
    );
    const h2 = container.querySelector('h2');
    expect(h2).toHaveStyle({
      fontWeight: 'bold',
      fontSize: '14pt',
      color: 'blue',
    });
  });

  it('should not use TableBlock for non-centered headings', () => {
    const { container } = render(<Heading>Not Centered</Heading>);
    const table = container.querySelector('table');
    expect(table).not.toBeInTheDocument();
  });
});

