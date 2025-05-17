import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { S3ImageNodeView } from './S3ImageNodeView';

// Mock getImageHref
jest.mock('../../editor/utils/image', () => ({
  getImageHref: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/test.jpg'),
}));

describe('S3ImageNodeView', () => {
  it('renders image with correct src, alt, and data-s3-path', async () => {
    const node = { attrs: { 'data-s3-path': 'test.jpg', alt: 'Test Image' } };
    render(<S3ImageNodeView node={node} selected={false} />);
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://test-bucket.s3.amazonaws.com/test.jpg');
      expect(img).toHaveAttribute('alt', 'Test Image');
      expect(img).toHaveAttribute('data-s3-path', 'test.jpg');
    });
  });

  it('renders image with empty alt if not provided', async () => {
    const node = { attrs: { 'data-s3-path': 'test.jpg' } };
    render(<S3ImageNodeView node={node} selected={false} />);
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', '');
    });
  });
}); 