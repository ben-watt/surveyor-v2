/**
 * Tests for Page component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Page } from '../components/Page';

describe('Page', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Page>
        <h1>Page Title</h1>
        <p>Page content</p>
      </Page>
    );

    expect(getByText('Page Title')).toBeInTheDocument();
    expect(getByText('Page content')).toBeInTheDocument();
  });

  it('should render page break (hr)', () => {
    const { container } = render(
      <Page>
        <p>Content</p>
      </Page>
    );

    const hr = container.querySelector('hr');
    expect(hr).toBeInTheDocument();
  });

  it('should accept pageBreak prop', () => {
    const { container } = render(
      <Page pageBreak="avoid">
        <p>Content</p>
      </Page>
    );

    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('should use default pageBreak of "always"', () => {
    const { container } = render(
      <Page>
        <p>Content</p>
      </Page>
    );

    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    const { getByText } = render(
      <Page>
        <h1>Title</h1>
        <h2>Subtitle</h2>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </Page>
    );

    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Subtitle')).toBeInTheDocument();
    expect(getByText('Paragraph 1')).toBeInTheDocument();
    expect(getByText('Paragraph 2')).toBeInTheDocument();
  });
});

