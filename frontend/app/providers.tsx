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
          colorPrimary: isDark ? '#3b82f6' : '#1e3a8a', // High-contrast cobalt in dark mode, institutional navy in light mode
          colorSuccess: isDark ? '#10b981' : '#059669', // Emerald
          colorWarning: '#d97706', // Warm Amber
          colorError: '#dc2626',   // Crimson
          colorInfo: '#2563eb',    // Royal Blue
          colorTextBase: isDark ? '#f1f5f9' : '#0f172a',
          colorTextSecondary: isDark ? '#94a3b8' : '#64748b',
          colorBgBase: isDark ? '#090d16' : '#ffffff',
          colorBgLayout: isDark ? '#06090e' : '#f1f5f9',
          colorBorder: isDark ? 'rgba(255, 255, 255, 0.16)' : '#cbd5e1',
          colorBorderSecondary: isDark ? 'rgba(255, 255, 255, 0.10)' : '#e2e8f0',
          borderRadius: 8,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: 14,
        },
        components: {
          Layout: {
            siderBg: isDark ? '#0f172a' : '#ffffff',
            headerBg: isDark ? '#0f172a' : '#ffffff',
            bodyBg: isDark ? '#06090e' : '#f1f5f9',
          },
          Card: {
            colorBgContainer: isDark ? '#111827' : '#ffffff',
            colorBorderSecondary: isDark ? 'rgba(255, 255, 255, 0.16)' : '#cbd5e1',
            headerFontSize: 15,
            headerHeight: 48,
          },
          Table: {
            colorBgContainer: isDark ? '#111827' : '#ffffff',
            headerBg: isDark ? '#0f172a' : '#f1f5f9',
            headerColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : '#e2e8f0',
            rowHoverBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(30, 58, 138, 0.03)',
          },
          Button: {
            controlHeight: 36,
            controlHeightSM: 30,
            controlHeightLG: 42,
            fontWeight: 600,
          },
          Segmented: {
            colorBgLayout: isDark ? '#0f172a' : '#f1f5f9',
            itemSelectedBg: isDark ? '#1e293b' : '#ffffff',
          },
          Menu: {
            colorBgContainer: isDark ? '#0f172a' : '#ffffff',
            itemSelectedBg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
            itemSelectedColor: isDark ? '#60a5fa' : '#1e3a8a',
          },
          Modal: {
            headerBg: isDark ? '#111827' : '#ffffff',
            contentBg: isDark ? '#111827' : '#ffffff',
          },
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
            refetchInterval: 5000,
            refetchOnWindowFocus: true,
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
