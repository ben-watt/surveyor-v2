import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { S3ImageNodeView } from './S3ImageNodeView';
import userEvent from '@testing-library/user-event';

// Mock getImageHref
jest.mock('../../editor/utils/image', () => ({
  getImageHref: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/test.jpg'),
}));

jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../utils/tenant-utils', () => ({
  getCurrentTenantId: jest.fn().mockResolvedValue('tenant-123'),
}));
jest.mock('../../utils/file-utils', () => ({
  sanitizeFileName: jest.fn((name) => name),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

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

  it('renders image with src directly if no data-s3-path is present', async () => {
    const node = { attrs: { src: 'https://example.com/image.png', alt: 'Direct Image' } };
    render(<S3ImageNodeView node={node} selected={false} />);
    // Wait a tick to allow any effects to run
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/image.png');
      expect(img).toHaveAttribute('alt', 'Direct Image');
      expect(img).not.toHaveAttribute('data-s3-path');
    });
    // getImageHref should not be called
    const { getImageHref } = require('../../editor/utils/image');
    expect(getImageHref).not.toHaveBeenCalled();
  });

  it('uploads image when src is a blob and updates attributes', async () => {
    const updateAttributes = jest.fn();
    const node = {
      attrs: {
        src: 'blob:http://localhost/test-blob',
        alt: 'Blob Image',
        'data-uploading-id': 'upload-1',
      },
    };
    // Mock fetch for blob
    global.fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['test'], { type: 'image/png' })),
    }) as any;

    render(<S3ImageNodeView node={node} selected={false} updateAttributes={updateAttributes} />);
    // Wait for upload and presigned URL logic
    await waitFor(() => {
      expect(updateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'data-s3-path': expect.stringContaining('report-images/tenant-123/'),
          'data-uploading-id': null,
        })
      );
      // Should update to presigned URL
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://test-bucket.s3.amazonaws.com/test.jpg');
    });
  });

  it('applies correct alignment style to wrapper', async () => {
    const alignments = [
      { align: 'left', expected: 'left' },
      { align: 'center', expected: 'center' },
      { align: 'right', expected: 'right' },
      { align: 'justify', expected: 'justify' },
    ];
    for (const { align, expected } of alignments) {
      const node = { attrs: { 'data-s3-path': 'test.jpg', align } };
      const { container, unmount } = render(<S3ImageNodeView node={node} selected={false} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle(`text-align: ${expected}`);
      unmount();
    }
  });
}); 