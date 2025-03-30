import { render, screen, fireEvent } from '@testing-library/react';
import { AddressDisplay } from '../AddressDisplay';
import { Address } from '@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema';

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

  it('shows full address on hover', () => {
    render(<AddressDisplay address={mockAddress} />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    
    // The formatted address should be in a paragraph element
    const addressText = screen.getByText((content) => {
      return content.includes('123 Test Street') && 
             content.includes('Test City') && 
             content.includes('TS1 1TS');
    });
    expect(addressText).toBeInTheDocument();
  });

  it('hides full address when mouse leaves', () => {
    render(<AddressDisplay address={mockAddress} />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    
    const addressText = screen.queryByText((content) => {
      return content.includes('123 Test Street') && 
             content.includes('Test City') && 
             content.includes('TS1 1TS');
    });
    expect(addressText).not.toBeInTheDocument();
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