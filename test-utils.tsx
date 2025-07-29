import React from 'react';
import { render as rtlRender } from '@testing-library/react';

// QueryClient imports commented out until @tanstack/react-query is installed
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// function createTestQueryClient() {
//   return new QueryClient({
//     defaultOptions: {
//       queries: {
//         retry: false,
//       },
//     },
//   });
// }

export function renderWithProviders(
  ui: React.ReactElement,
  options?: any
) {
  // const queryClient = createTestQueryClient();
  
  // function Wrapper({ children }: { children: React.ReactNode }) {
  //   return (
  //     <QueryClientProvider client={queryClient}>
  //       {children}
  //     </QueryClientProvider>
  //   );
  // }

  return rtlRender(ui, { ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };