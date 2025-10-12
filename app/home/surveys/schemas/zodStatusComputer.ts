import type { StatusResult } from './types';

// Removed unused status computer functions - now using simpler inline approach

/**
 * Creates a memoized version of a Zod status computer
 */
export function memoizeZodStatusComputer<T>(
  statusComputer: (data: T) => StatusResult,
): (data: T) => StatusResult {
  let lastInput: string;
  let lastResult: StatusResult;

  return (data: T): StatusResult => {
    const currentInput = JSON.stringify(data);
    if (currentInput === lastInput && lastResult) {
      return lastResult;
    }

    lastInput = currentInput;
    lastResult = statusComputer(data);
    return lastResult;
  };
}
