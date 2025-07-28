import '@testing-library/jest-dom';

// Mock JSDOM missing methods for Radix UI components
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

// Mock ResizeObserver for Radix UI
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock PointerEvent for better component compatibility
global.PointerEvent = class PointerEvent extends Event {
  constructor(type, props) {
    super(type, props);
    this.pointerId = props?.pointerId || 0;
    this.pointerType = props?.pointerType || 'mouse';
  }
}; 