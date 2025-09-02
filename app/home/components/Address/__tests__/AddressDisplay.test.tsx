import { render, screen, fireEvent } from '@testing-library/react';
import { AddressDisplay } from '../AddressDisplay';
import { Address } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { describe, it } from '@jest/globals';

describe('AddressDisplay', () => {
  const mockAddress: Address = {
    formatted: '123 Test Street\nTest City\nTS1 1TS',
    line1: '123 Test Street',
    city: 'Test City',
    postcode: 'TS1 1TS',
    location: {
      lat: 51.5074,
      lng: -0.1278
    }
  };

  it('renders the shortened address by default', () => {
    render(<AddressDisplay address={mockAddress} maxLength={10} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('123 Test S...');
  });

  it('uses default maxLength of 15 when not provided', () => {
    render(<AddressDisplay address={mockAddress} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('123 Test Street...');
  });

  it('shows full address without truncation when shorter than maxLength', () => {
    const shortAddress: Address = {
      ...mockAddress,
      formatted: '123 Test St',
      line1: '123 Test St'
    };
    
    render(<AddressDisplay address={shortAddress} maxLength={15} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('123 Test St');
  });
});