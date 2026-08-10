import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * useQuery/useMutation을 쓰는 컴포넌트는 QueryClientProvider가 필요하다.
 * 테스트마다 새 QueryClient를 만들어 캐시가 새어나가지 않게 하고,
 * 재시도를 끄기 위해 retry: false로 둔다 (기본값이면 실패 케이스가 느려진다).
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { ...render(ui, { wrapper }), queryClient };
}
