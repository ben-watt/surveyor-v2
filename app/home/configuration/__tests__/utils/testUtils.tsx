import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Default router mock
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

export const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Setup router mock with default values
export const setupRouterMock = (overrides = {}) => {
  mockUseRouter.mockReturnValue({
    ...mockRouter,
    ...overrides,
  });
};

// Custom render function for tests
export const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, options);
};

// Mock localStorage
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// Setup localStorage mock
export const setupLocalStorageMock = () => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
};

// Mock URL constructor
export const mockURL = (url: string, base?: string) => ({
  toString: () => url,
  searchParams: {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
});

// Mock window.location
export const mockLocation = (overrides = {}) => {
  const location = {
    origin: 'http://localhost:3000',
    pathname: '/home/configuration',
    search: '',
    hash: '',
    ...overrides,
  };
  
  Object.defineProperty(window, 'location', {
    value: location,
    writable: true,
  });
  
  return location;
};

// Clean up mocks after each test
export const cleanupMocks = () => {
  jest.clearAllMocks();
  mockLocalStorage.clear();
};