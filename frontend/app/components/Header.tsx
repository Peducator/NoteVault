'use client';

import React from 'react';
import { Flex, Button, Typography, Badge, Space, Tooltip } from 'antd';
import {
  MenuOutlined,
  PlusOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { ThemeToggle } from './ThemeToggle';

const { Title } = Typography;

interface HeaderProps {
  title?: string;
  isSyncing?: boolean;
  onNewExpenseClick?: () => void;
  onToggleMenu?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Chi tiêu',
  isSyncing = false,
  onNewExpenseClick,
  onToggleMenu,
  onLogout,
}) => {
  return (
    <header
      style={{
        height: '64px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(140, 140, 140, 0.2)',
        flexShrink: 0,
      }}
    >
      <Flex align="center" gap="middle">
        {onToggleMenu && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onToggleMenu}
            className="header-mobile-toggle"
            aria-label="Mở menu"
          />
        )}
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
      </Flex>

      <Space size="middle" align="center">
        {/* Chỉ báo đồng bộ */}
        <Badge
          status={isSyncing ? 'processing' : 'success'}
          text={
            <span style={{ fontSize: '12px', color: 'gray' }} className="header-sync-text">
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ trực tiếp'}
            </span>
          }
        />

        <ThemeToggle />

        {onNewExpenseClick && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onNewExpenseClick}
          >
            Nộp hóa đơn
          </Button>
        )}

        {onLogout && (
          <Tooltip title="Đăng xuất">
            <Button
              danger
              type="text"
              icon={<LogoutOutlined />}
              onClick={onLogout}
            />
          </Tooltip>
        )}
      </Space>

      <style jsx global>{`
        .header-mobile-toggle {
          display: inline-flex !important;
        }
        @media (min-width: 992px) {
          .header-mobile-toggle {
            display: none !important;
          }
        }
        @media (max-width: 576px) {
          .header-sync-text {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
