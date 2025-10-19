import React from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '@/components/breadcrumbs';

let mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('Breadcrumbs', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  it('shortens a GUID found anywhere in a segment and decodes %23', () => {
    mockPathname =
      '/home/configuration/components/tenant-abc-18f3b5f4-1a2b-4c3d-8e9f-abcdef123456%23x/view';

    render(<Breadcrumbs />);

    // The GUID should be shortened to first 8 chars followed by '...'
    expect(screen.getByText('18f3b5f4...')).toBeInTheDocument();

    // The last segment "view" should render normally
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('redirects config entity crumbs to /home/configuration', () => {
    mockPathname = '/home/configuration/components/18f3b5f4-1a2b-4c3d-8e9f-abcdef123456';

    render(<Breadcrumbs />);

    // The "Components" crumb should link back to the main configuration page
    const componentsLink = screen.getByRole('link', { name: 'Components' });
    expect(componentsLink).toHaveAttribute('href', '/home/configuration');
  });

  it('decodes encoded hash (%23) so labels display # correctly', () => {
    mockPathname = '/home/configuration/elements/abc%23def';

    render(<Breadcrumbs />);

    // Ensure a # appears in the rendered breadcrumb label
    expect(screen.getByText(/#/)).toBeInTheDocument();
  });
});
