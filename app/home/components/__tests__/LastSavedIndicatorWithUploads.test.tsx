import React from 'react';
import { render, screen } from '@testing-library/react';
import { LastSavedIndicatorWithUploads } from '../LastSavedIndicatorWithUploads';
import { AutoSaveStatus } from '../../hooks/useAutoSave';

describe('LastSavedIndicatorWithUploads', () => {
  const mockDate = new Date('2023-01-01T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should prioritize upload status over save status', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={true}
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Uploading images...')).toBeInTheDocument();
    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
  });

  it('should show save status when not uploading', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.queryByText('Uploading images...')).not.toBeInTheDocument();
  });

  it('should render pending status with yellow color when not uploading', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="pending"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Changes pending...')).toBeInTheDocument();
    
    const container = screen.getByText('Changes pending...').closest('.text-yellow-600');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('text-yellow-600');
  });

  it('should render uploading status with blue color', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="idle"
        isUploading={true}
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Uploading images...')).toBeInTheDocument();
    
    const container = screen.getByText('Uploading images...').closest('.text-blue-600');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('text-blue-600');
  });

  it('should render saving status when not uploading', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saving"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    const container = screen.getByText('Saving...').closest('.text-blue-600');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('text-blue-600');
  });

  it('should render error status when not uploading', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="error"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Save failed')).toBeInTheDocument();
    
    const container = screen.getByText('Save failed').closest('.text-red-600');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('text-red-600');
  });

  it('should render autosaved status when not uploading', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="autosaved"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    expect(screen.getByText('Auto-saved')).toBeInTheDocument();
    
    // The text-green-600 class is on the outer container, not the inner div
    const container = screen.getByText('Auto-saved').closest('.text-green-600');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('text-green-600');
  });

  it('should not show timestamp when uploading', () => {
    const lastSavedAt = new Date('2023-01-01T11:30:00Z');
    
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={true}
        lastSavedAt={lastSavedAt}
      />
    );

    expect(screen.getByText('Uploading images...')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should show timestamp when not uploading and status allows it', () => {
    const lastSavedAt = new Date('2023-01-01T11:30:00Z');
    
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={false}
        lastSavedAt={lastSavedAt}
      />
    );

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.getByText('Last saved 30 minutes ago')).toBeInTheDocument();
  });

  it('should not show timestamp for pending status', () => {
    const lastSavedAt = new Date('2023-01-01T11:30:00Z');
    
    render(
      <LastSavedIndicatorWithUploads
        status="pending"
        isUploading={false}
        lastSavedAt={lastSavedAt}
      />
    );

    expect(screen.getByText('Changes pending...')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should not show timestamp for saving status', () => {
    const lastSavedAt = new Date('2023-01-01T11:30:00Z');
    
    render(
      <LastSavedIndicatorWithUploads
        status="saving"
        isUploading={false}
        lastSavedAt={lastSavedAt}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should not show timestamp for error status', () => {
    const lastSavedAt = new Date('2023-01-01T11:30:00Z');
    
    render(
      <LastSavedIndicatorWithUploads
        status="error"
        isUploading={false}
        lastSavedAt={lastSavedAt}
      />
    );

    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should prioritize lastSavedAt over entityUpdatedAt', () => {
    const lastSavedAt = new Date('2023-01-01T11:55:00Z');
    const entityUpdatedAt = '2023-01-01T11:30:00Z';
    
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={false}
        lastSavedAt={lastSavedAt}
        entityUpdatedAt={entityUpdatedAt}
      />
    );

    expect(screen.getByText('Last saved 5 minutes ago')).toBeInTheDocument();
  });

  it('should fall back to entityUpdatedAt when no lastSavedAt', () => {
    const entityUpdatedAt = '2023-01-01T11:30:00Z';
    
    render(
      <LastSavedIndicatorWithUploads
        status="idle"
        isUploading={false}
        entityUpdatedAt={entityUpdatedAt}
      />
    );

    expect(screen.getByText('Last saved 30 minutes ago')).toBeInTheDocument();
  });

  it('should include transition animation classes', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    const container = screen.getByText('All changes saved').closest('.ease-in-out');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
  });

  it('should apply custom className', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={false}
        lastSavedAt={mockDate}
        className="custom-class"
      />
    );

    const container = screen.getByText('All changes saved').closest('.custom-class');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('custom-class');
  });

  it('should hide icon when showIcon is false', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={false}
        lastSavedAt={mockDate}
        showIcon={false}
      />
    );

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });

  it('should hide timestamp when showTimestamp is false', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={false}
        lastSavedAt={mockDate}
        showTimestamp={false}
      />
    );

    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should show spinning animation for uploading status', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="idle"
        isUploading={true}
        lastSavedAt={mockDate}
      />
    );

    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });

  it('should show spinning animation for saving status', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="saving"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });

  it('should show pulse animation for pending status', () => {
    render(
      <LastSavedIndicatorWithUploads
        status="pending"
        isUploading={false}
        lastSavedAt={mockDate}
      />
    );

    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('animate-pulse');
  });

  it('should handle uploadProgress prop', () => {
    const uploadProgress = {
      'path1': true,
      'path2': false
    };
    
    render(
      <LastSavedIndicatorWithUploads
        status="saved"
        isUploading={true}
        lastSavedAt={mockDate}
        uploadProgress={uploadProgress}
      />
    );

    // Component should still prioritize isUploading status
    expect(screen.getByText('Uploading images...')).toBeInTheDocument();
  });
});