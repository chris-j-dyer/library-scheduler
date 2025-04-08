// Import Jest DOM matchers
import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { vi } from 'vitest';

// Mock toast functionality (using ESM compatible approach)
vi.mock('@/hooks/use-toast', () => {
  return {
    useToast: () => ({
      toast: vi.fn(),
    }),
  };
});

// Mock Auth context
vi.mock('@/hooks/use-auth', () => {
  return {
    useAuth: () => ({
      user: {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
      },
      isLoading: false,
      error: null,
      loginMutation: {
        isPending: false,
        mutate: vi.fn(),
      },
      logoutMutation: {
        isPending: false,
        mutate: vi.fn(),
      },
      registerMutation: {
        isPending: false,
        mutate: vi.fn(),
      },
    }),
    AuthProvider: ({ children }) => children,
  };
});

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock the WebSocket constructor
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1, // OPEN
})) as any;

// Set up global fetch mock if not using MSW
global.fetch = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Add a global mock for window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5000/',
    host: 'localhost:5000',
    pathname: '/',
    protocol: 'http:',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
});

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      /Warning.*not wrapped in act/i.test(args[0]) ||
      /Warning.*React.createElement: type is invalid/i.test(args[0])
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});