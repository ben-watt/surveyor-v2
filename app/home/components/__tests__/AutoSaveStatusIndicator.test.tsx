import React from 'react';
import { render, screen } from '@testing-library/react';
import { AutoSaveStatusIndicator } from '@/app/home/components/AutoSaveStatus';
import { AutoSaveStatus } from '@/app/home/hooks/useAutoSave';

describe('AutoSaveStatusIndicator', () => {
  it('should render saving status with spinner', () => {
    render(<AutoSaveStatusIndicator status="saving" />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });

  it('should render saved status', () => {
    render(<AutoSaveStatusIndicator status="saved" />);

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });

  it('should render autosaved status', () => {
    render(<AutoSaveStatusIndicator status="autosaved" />);

    expect(screen.getByText('Auto-saved')).toBeInTheDocument();
  });

  it('should render error status', () => {
    render(<AutoSaveStatusIndicator status="error" />);

    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('should not render for idle status', () => {
    const { container } = render(<AutoSaveStatusIndicator status="idle" />);

    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    render(<AutoSaveStatusIndicator status="saved" className="custom-class" />);

    const container = screen.getByText('All changes saved').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('should hide icon when showIcon is false', () => {
    render(<AutoSaveStatusIndicator status="saved" showIcon={false} />);

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });

  it('should hide text when showText is false', () => {
    render(<AutoSaveStatusIndicator status="saved" showText={false} />);

    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
    // Icon should still be present
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should show only icon when showText is false', () => {
    render(<AutoSaveStatusIndicator status="saving" showText={false} />);

    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('animate-spin');
  });

  it('should show only text when showIcon is false', () => {
    render(<AutoSaveStatusIndicator status="saved" showIcon={false} />);

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });

  it('should have correct color classes for different statuses', () => {
    const { rerender } = render(<AutoSaveStatusIndicator status="saving" />);

    let container = screen.getByText('Saving...').closest('div');
    expect(container).toHaveClass('text-blue-600');

    rerender(<AutoSaveStatusIndicator status="saved" />);
    container = screen.getByText('All changes saved').closest('div');
    expect(container).toHaveClass('text-green-600');

    rerender(<AutoSaveStatusIndicator status="autosaved" />);
    container = screen.getByText('Auto-saved').closest('div');
    expect(container).toHaveClass('text-green-600');

    rerender(<AutoSaveStatusIndicator status="error" />);
    container = screen.getByText('Save failed').closest('div');
    expect(container).toHaveClass('text-red-600');
  });
});
