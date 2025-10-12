import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Reset localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => {
    const q = String(query || '');
    // Treat desktop queries as matching to avoid mobile drawer (vaul) in tests
    const isDesktop = /min-width:\s*768px/.test(q);
    return {
      matches: isDesktop,
      media: q,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: `ReactDOMTestUtils.act` is deprecated') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('was not wrapped in act(...)'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

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

// Polyfill pointer capture APIs required by components using pointer events (e.g., vaul)
if (!Element.prototype.setPointerCapture) {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    value: jest.fn(),
    writable: true,
  });
}

if (!Element.prototype.releasePointerCapture) {
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    value: jest.fn(),
    writable: true,
  });
}

if (!Element.prototype.hasPointerCapture) {
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    value: jest.fn().mockReturnValue(false),
    writable: true,
  });
}

// Ensure requestAnimationFrame exists for components relying on it during tests
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}
if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}
