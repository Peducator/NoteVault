'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchInterval: 5000, // Tự động refetch định kỳ mỗi 5s để đồng bộ trạng thái giữa các thiết bị
            refetchOnWindowFocus: true, // Tự động refetch ngay khi người dùng chuyển lại tab/ứng dụng
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
