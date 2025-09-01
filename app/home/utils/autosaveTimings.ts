export function getAutoSaveTimings(defaultDelayMs: number = 300) {
  const isTest = process.env.NODE_ENV === 'test';
  return {
    delay: isTest ? 10 : defaultDelayMs,
    watchDelay: isTest ? 0 : 300,
  };
}


