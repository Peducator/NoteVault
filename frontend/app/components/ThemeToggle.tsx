'use client';

import React, { useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
    return <Button shape="circle" size="middle" loading />;
  }

  const isDark = theme === 'dark';

  return (
    <Tooltip title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}>
      <Button
        shape={showLabel ? 'default' : 'circle'}
        icon={isDark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} />}
        onClick={toggleTheme}
        aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      >
        {showLabel ? (isDark ? 'Sáng' : 'Tối') : null}
      </Button>
    </Tooltip>
  );
};
