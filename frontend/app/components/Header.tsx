'use client';

import React from 'react';
import { Flex, Button, Typography, Badge, Space, Tooltip, theme } from 'antd';
import {
  MenuOutlined,
  PlusOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { ThemeToggle } from './ThemeToggle';

const { Text } = Typography;

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
  const { token } = theme.useToken();

  return (
    <header
      className="dashboard-header"
      style={{
        height: '60px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
        gap: '12px',
      }}
    >
      <Flex align="center" gap="middle" style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        {onToggleMenu && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onToggleMenu}
            className="header-mobile-toggle"
            aria-label="Mở menu"
            style={{ flexShrink: 0 }}
          />
        )}
        <Flex align="baseline" gap="small" style={{ minWidth: 0, overflow: 'hidden' }}>
          <Text strong style={{ fontSize: '15px', color: token.colorText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }} className="header-crumb-text">
            / NoteVault Treasury
          </Text>
        </Flex>
      </Flex>

      <Space size="middle" align="center" style={{ flexShrink: 0 }}>
        {/* Live sync badge */}
        <Badge
          status={isSyncing ? 'processing' : 'success'}
          text={
            <span style={{ fontSize: '12px', color: token.colorTextSecondary, fontWeight: 500 }} className="header-sync-text">
              {isSyncing ? 'Đang đồng bộ...' : 'Hệ thống trực tuyến'}
            </span>
          }
        />

        <ThemeToggle />

        {onNewExpenseClick && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onNewExpenseClick}
            style={{
              backgroundColor: token.colorPrimary,
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            <span className="header-new-expense-text">Nộp hóa đơn</span>
          </Button>
        )}

        {onLogout && (
          <Tooltip title="Đăng xuất an toàn">
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
          .header-sync-text,
          .header-new-expense-text,
          .header-crumb-text {
            display: none !important;
          }
          .dashboard-header {
            padding: 0 14px !important;
          }
        }
      `}</style>
    </header>
  );
};
