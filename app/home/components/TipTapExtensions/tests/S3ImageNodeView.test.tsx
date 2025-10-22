import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { S3ImageNodeView } from '../S3ImageNodeView';
import S3ImageExtension from '../S3ImageNodeView';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// Mock getImageHref
jest.mock('../../../editor/utils/image', () => ({
  getImageHref: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/test.jpg'),
}));

jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../utils/tenant-utils', () => ({
  getCurrentTenantId: jest.fn().mockResolvedValue('tenant-123'),
}));
jest.mock('../../../utils/file-utils', () => ({
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
    const { getImageHref } = require('../../../editor/utils/image');
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
        }),
      );
      // Should update to presigned URL
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'https://test-bucket.s3.amazonaws.com/test.jpg',
      );
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

describe('S3ImageExtension parseHTML', () => {
  const TestEditor = ({ html }: { html: string }) => {
    const editor = useEditor({
      extensions: [StarterKit, S3ImageExtension],
      content: html,
    });

    return <EditorContent editor={editor} />;
  };

  it('parses images with data-s3-path attribute', () => {
    const html = '<img src="/test.jpg" alt="Test" data-s3-path="report-images/test.jpg" width="800" />';
    const { container } = render(<TestEditor html={html} />);
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('data-s3-path', 'report-images/test.jpg');
    expect(img).toHaveAttribute('alt', 'Test');
  });

  it('parses images with public URLs (no data-s3-path)', () => {
    const html = '<img src="/typical-house.webp" alt="typical house" width="800" />';
    const { container } = render(<TestEditor html={html} />);
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'typical house');
    // data-s3-path should be null/undefined since it wasn't in the HTML
  });

  it('parses images with data URLs', () => {
    const dataUrl =
      "data:image/svg+xml,%3Csvg width='600' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='600' height='400' fill='%23cccccc'/%3E%3C/svg%3E";
    const html = `<img src="${dataUrl}" alt="placeholder" width="600" height="400" />`;
    const { container } = render(<TestEditor html={html} />);
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'placeholder');
  });

  it('parses images with width and height attributes', () => {
    const html = '<img src="/test.jpg" alt="Test" width="800" height="600" />';
    const { container } = render(<TestEditor html={html} />);
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('parses images with align attribute', () => {
    const html = '<img src="/test.jpg" alt="Test" align="center" />';
    const { container } = render(<TestEditor html={html} />);
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('parses template images exactly as they appear in BuildingSurveyReport', () => {
    // Test the actual HTML from the template
    const typicalHouseHtml =
      '<img src="/typical-house.webp" alt="typical house" width="800" />';
    const locationPlanHtml =
      "<img src=\"data:image/svg+xml,%3Csvg width='600' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='600' height='400' fill='%23cccccc'/%3E%3Ctext x='300' y='200' font-family='Arial' font-size='24' fill='%23666666' text-anchor='middle' dominant-baseline='middle'%3ELocation Plan Placeholder%3C/text%3E%3C/svg%3E\" alt=\"placeholder\" width=\"600\" height=\"400\" />";

    const { container: container1 } = render(<TestEditor html={typicalHouseHtml} />);
    const img1 = container1.querySelector('img');
    expect(img1).toBeInTheDocument();
    expect(img1).toHaveAttribute('alt', 'typical house');

    const { container: container2 } = render(<TestEditor html={locationPlanHtml} />);
    const img2 = container2.querySelector('img');
    expect(img2).toBeInTheDocument();
    expect(img2).toHaveAttribute('alt', 'placeholder');
  });
});
