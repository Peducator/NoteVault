'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App, theme as antdTheme } from 'antd';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AntdConfigWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}

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
      <AntdConfigWrapper>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AntdConfigWrapper>
    </ThemeProvider>
  );
}
