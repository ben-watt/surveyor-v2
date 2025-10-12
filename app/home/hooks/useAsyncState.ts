import React, { useEffect, useState } from 'react';

type useAsyncStateResult<T> = [isLoading: boolean, data: T | null];

export const useAsyncState = <T>(promise: Promise<T | undefined>): useAsyncStateResult<T> => {
  const [state, setState] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    promise.then((data) => {
      if (data !== undefined) {
        setState(data);
      }
      setIsLoading(false);
    });
  }, [promise]);

  return [isLoading, state];
};

type useAsyncArrayStateResult<T> = [
  isLoading: boolean,
  data: T[],
  setData: React.Dispatch<React.SetStateAction<T[]>>,
];

export const useAsyncArrayState = <T>(
  fn: () => Promise<T[] | undefined>,
): useAsyncArrayStateResult<T> => {
  const [state, setState] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const result = await fn();
        if (result) {
          setState(result);
        }
      } catch (err) {
        console.log('[useAsyncArrayState]', 'failed to fetch data', err);
      }

      setIsLoading(false);
    }

    fetch();
  }, [fn]);
  // Ignore exhaustive dependencies here it causes mutliple requests over and over again.

  return [isLoading, state, setState];
};
