import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  fetchUserAttributes: jest.fn(),
}));
import * as AmplifyAuth from 'aws-amplify/auth';

describe('useUser hooks caching and coalescing', () => {
  const auth = AmplifyAuth as unknown as {
    getCurrentUser: jest.Mock;
    fetchUserAttributes: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.getCurrentUser.mockReset();
    auth.fetchUserAttributes.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test('useUserAttributes coalesces concurrent calls and caches result', async () => {
    auth.fetchUserAttributes.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ email: 'test@example.com' } as any), 10),
        ),
    );

    const { useUserAttributes } = await import('@/app/home/utils/useUser');

    const Consumer = ({ id }: { id: number }) => {
      const [hydrated] = useUserAttributes();
      return <div data-testid={`attrs-${id}`}>{hydrated ? 'hydrated' : 'loading'}</div>;
    };

    const ManyConsumers = () => (
      <>
        {Array.from({ length: 8 }).map((_, i) => (
          <Consumer key={i} id={i} />
        ))}
      </>
    );

    render(<ManyConsumers />);

    // Ensure only one network call for all consumers
    await waitFor(() => {
      expect(auth.fetchUserAttributes).toHaveBeenCalledTimes(1);
    });

    // Unmount previous tree to avoid duplicate text matches
    cleanup();

    // Render another consumer later; should use cache (no new calls)
    const Single = () => {
      const [hydrated] = useUserAttributes();
      return <div>{hydrated ? 'hydrated' : 'loading'}</div>;
    };
    render(<Single />);
    await screen.findByText('hydrated');
    expect(auth.fetchUserAttributes).toHaveBeenCalledTimes(1);
  });

  test('useUserHook coalesces concurrent calls and caches result', async () => {
    auth.getCurrentUser.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ username: 'john', userId: 'u-1', signInDetails: {} } as any),
            10,
          ),
        ),
    );

    const { useUserHook } = await import('@/app/home/utils/useUser');

    const Consumer = ({ id }: { id: number }) => {
      const [hydrated] = useUserHook();
      return <div data-testid={`user-${id}`}>{hydrated ? 'hydrated' : 'loading'}</div>;
    };

    const ManyConsumers = () => (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <Consumer key={i} id={i} />
        ))}
      </>
    );

    render(<ManyConsumers />);

    // Ensure only one network call for all consumers
    await waitFor(() => {
      expect(auth.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    // Unmount previous tree to avoid duplicate text matches
    cleanup();

    // Subsequent consumer uses cached value
    const Single = () => {
      const [hydrated] = useUserHook();
      return <div>{hydrated ? 'hydrated' : 'loading'}</div>;
    };
    render(<Single />);
    await screen.findByText('hydrated');
    expect(auth.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
