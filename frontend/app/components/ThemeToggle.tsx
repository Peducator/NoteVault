'use client';

import React, { useEffect, useState } from 'react';
import { Switch, Tooltip, Space, Typography } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';

const { Text } = Typography;

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ width: 44, height: 22, borderRadius: 100, background: 'rgba(148, 163, 184, 0.2)' }} />
    );
  }

  const isDark = theme === 'dark';

  return (
    <Tooltip title={isDark ? 'Chế độ Tối (Nhấn để chuyển sang Sáng)' : 'Chế độ Sáng (Nhấn để chuyển sang Tối)'}>
      <Space size={6} align="center">
        <Switch
          checked={isDark}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined style={{ fontSize: 11, color: '#fbbf24' }} />}
          unCheckedChildren={<SunOutlined style={{ fontSize: 11, color: '#f59e0b' }} />}
          aria-label="Công tắc chế độ sáng tối"
          style={{
            backgroundColor: isDark ? '#2563eb' : '#94a3b8',
          }}
        />
        {showLabel && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isDark ? 'Tối' : 'Sáng'}
          </Text>
        )}
      </Space>
    </Tooltip>
  );
};
