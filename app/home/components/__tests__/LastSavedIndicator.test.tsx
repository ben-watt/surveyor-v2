import React from 'react';
import { render, screen } from '@testing-library/react';
import { LastSavedIndicator } from '@/app/home/components/LastSavedIndicator';
import { AutoSaveStatus } from '@/app/home/hooks/useAutoSave';

describe('LastSavedIndicator', () => {
  const mockDate = new Date('2023-01-01T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render idle status with entity timestamp', () => {
    const entityUpdatedAt = '2023-01-01T11:30:00Z';
    
    render(
      <LastSavedIndicator
        status="idle"
        entityUpdatedAt={entityUpdatedAt}
      />
    );

    expect(screen.getByText('Last saved')).toBeInTheDocument();
    expect(screen.getByText('Last saved 30 minutes ago')).toBeInTheDocument();
  });

  it('should render saving status', () => {
    render(
      <LastSavedIndicator
        status="saving"
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should render saved status with timestamp', () => {
    const savedDate = new Date('2023-01-01T11:45:00Z');
    
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={savedDate}
      />
    );

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.getByText('Last saved 15 minutes ago')).toBeInTheDocument();
  });

  it('should render autosaved status with timestamp', () => {
    const savedDate = new Date('2023-01-01T11:50:00Z');
    
    render(
      <LastSavedIndicator
        status="autosaved"
        lastSavedAt={savedDate}
      />
    );

    expect(screen.getByText('Auto-saved')).toBeInTheDocument();
    expect(screen.getByText('Last saved 10 minutes ago')).toBeInTheDocument();
  });

  it('should render error status', () => {
    render(
      <LastSavedIndicator
        status="error"
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should render pending status with yellow color', () => {
    render(
      <LastSavedIndicator
        status="pending"
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Changes pending...')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
    
    // Check that it uses yellow color class - look for the outer container
    const container = screen.getByText('Changes pending...').closest('.text-yellow-600');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('text-yellow-600');
  });

  it('should format "just now" for recent saves', () => {
    const recentDate = new Date('2023-01-01T11:59:30Z'); // 30 seconds ago
    
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={recentDate}
      />
    );

    expect(screen.getByText('Last saved Just now')).toBeInTheDocument();
  });

  it('should format hours correctly', () => {
    const twoHoursAgo = new Date('2023-01-01T10:00:00Z');
    
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={twoHoursAgo}
      />
    );

    expect(screen.getByText('Last saved 2 hours ago')).toBeInTheDocument();
  });

  it('should format single hour correctly', () => {
    const oneHourAgo = new Date('2023-01-01T11:00:00Z');
    
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={oneHourAgo}
      />
    );

    expect(screen.getByText('Last saved 1 hour ago')).toBeInTheDocument();
  });

  it('should format days correctly', () => {
    const yesterday = new Date('2022-12-31T12:00:00Z');
    
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={yesterday}
      />
    );

    // Use a flexible matcher for date format (could be MM/DD/YYYY or DD/MM/YYYY)
    expect(screen.getByText((content) =>
      content.startsWith('Last saved') && 
      (content.includes('12/31/2022') || content.includes('31/12/2022'))
    )).toBeInTheDocument();
  });

  it('should prioritize lastSavedAt over entityUpdatedAt', () => {
    const lastSavedAt = new Date('2023-01-01T11:55:00Z');
    const entityUpdatedAt = '2023-01-01T11:30:00Z';
    
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={lastSavedAt}
        entityUpdatedAt={entityUpdatedAt}
      />
    );

    expect(screen.getByText('Last saved 5 minutes ago')).toBeInTheDocument();
  });

  it('should fall back to entityUpdatedAt when no lastSavedAt', () => {
    const entityUpdatedAt = '2023-01-01T11:30:00Z';
    
    render(
      <LastSavedIndicator
        status="idle"
        entityUpdatedAt={entityUpdatedAt}
      />
    );

    expect(screen.getByText('Last saved 30 minutes ago')).toBeInTheDocument();
  });

  it('should not show timestamp for saving status', () => {
    render(
      <LastSavedIndicator
        status="saving"
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should not show timestamp for error status', () => {
    render(
      <LastSavedIndicator
        status="error"
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should not show timestamp for pending status', () => {
    render(
      <LastSavedIndicator
        status="pending"
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Changes pending...')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should include transition animation classes', () => {
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={mockDate}
      />
    );

    const container = screen.getByText('All changes saved').closest('.ease-in-out');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
  });

  it('should apply custom className', () => {
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={mockDate}
        className="custom-class"
      />
    );

    // The custom class is applied to the outer container, not the inner div
    const container = screen.getByText('All changes saved').parentElement?.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('should hide icon when showIcon is false', () => {
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={mockDate}
        showIcon={false}
      />
    );

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    // Check that no icon is present (no SVG elements)
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });



  it('should hide timestamp when showTimestamp is false', () => {
    render(
      <LastSavedIndicator
        status="saved"
        lastSavedAt={mockDate}
        showTimestamp={false}
      />
    );

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });
}); 