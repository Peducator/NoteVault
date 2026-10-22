'use client';

import React from 'react';
import { Layout, Menu, Avatar, Tag, Button, Flex, Typography, Drawer, Divider, Space } from 'antd';
import {
  DashboardOutlined,
  FileDoneOutlined,
  ApartmentOutlined,
  TeamOutlined,
  FileTextOutlined,
  LogoutOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

const { Sider } = Layout;
const { Text } = Typography;

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout?: () => void;
  tenantName?: string;
  userName?: string;
  departmentName?: string;
  unitName?: string;
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  tenantName = 'Doanh nghiệp',
  userName = 'Người dùng',
  departmentName = 'Phòng ban',
  unitName,
  userRole = 'MEMBER',
  isOpen = false,
  onClose,
}) => {
  const displayUnit = unitName || departmentName || 'Đơn vị';

  const menuItems = [
    { key: 'overview', icon: <DashboardOutlined />, label: 'Sổ cái & Chi tiêu' },
    { key: 'expenses', icon: <FileDoneOutlined />, label: 'Hóa đơn & Chứng từ' },
    { key: 'units', icon: <ApartmentOutlined />, label: 'Cây Đơn Vị & Ngân Sách' },
    { key: 'users', icon: <TeamOutlined />, label: 'Thành viên tổ chức' },
  ];

  const sidebarContent = (
    <Flex vertical style={{ height: '100%', padding: '16px' }} justify="space-between">
      {/* Header section */}
      <Flex vertical gap="middle">
        <Flex align="center" justify="space-between">
          <Flex align="center" gap="small">
            <Avatar
              shape="square"
              size={36}
              style={{ backgroundColor: '#2563eb' }}
              icon={<SafetyCertificateOutlined />}
            />
            <Text strong style={{ fontSize: '18px', letterSpacing: '-0.5px' }}>
              NoteVault
            </Text>
          </Flex>
          {onClose && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{ display: isOpen ? 'inline-flex' : 'none' }}
            />
          )}
        </Flex>

        {/* Tenant Box */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(140, 140, 140, 0.2)',
            background: 'rgba(140, 140, 140, 0.05)',
          }}
        >
          <Flex align="center" gap="small">
            <BankOutlined style={{ fontSize: '16px', color: '#1677ff' }} />
            <Flex vertical style={{ overflow: 'hidden' }}>
              <Text strong ellipsis style={{ fontSize: '12px' }}>
                {tenantName}
              </Text>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                FinTech Multi-Tenant
              </Text>
            </Flex>
          </Flex>
        </div>

        {/* Đơn vị trực thuộc */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(140, 140, 140, 0.15)',
            background: 'rgba(140, 140, 140, 0.03)',
          }}
        >
          <Flex justify="space-between" align="center">
            <Text type="secondary" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>
              Đơn vị
            </Text>
            {userRole === 'ROOT' && <Tag color="purple">ROOT</Tag>}
          </Flex>
          <Text strong ellipsis style={{ fontSize: '12px', marginTop: 2, display: 'block' }}>
            {displayUnit}
          </Text>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => {
            onTabChange(key);
            if (onClose) onClose();
          }}
          items={menuItems}
          style={{ border: 'none', background: 'transparent' }}
        />
      </Flex>

      {/* Footer User & Action Controls */}
      <Flex vertical gap="small">
        <Divider style={{ margin: '8px 0' }} />
        <Flex align="center" justify="space-between">
          <Flex align="center" gap="small" style={{ overflow: 'hidden' }}>
            <Avatar style={{ backgroundColor: '#1677ff' }}>
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            <Flex vertical style={{ overflow: 'hidden' }}>
              <Text strong ellipsis style={{ fontSize: '12px' }}>
                {userName}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {userRole === 'ROOT' ? 'Quản trị ROOT' : 'Thành viên'}
              </Text>
            </Flex>
          </Flex>
          <ThemeToggle />
        </Flex>

        <Link href="/docs" target="_blank" style={{ width: '100%' }}>
          <Button icon={<FileTextOutlined />} block type="dashed" size="small">
            API Docs & Đối soát
          </Button>
        </Link>

        <Button
          danger
          icon={<LogoutOutlined />}
          block
          size="small"
          onClick={() => {
            if (onLogout) onLogout();
            else onTabChange('logout');
          }}
        >
          Đăng xuất
        </Button>
      </Flex>
    </Flex>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        open={isOpen}
        onClose={onClose}
        closable={false}
        styles={{ body: { padding: 0 } }}
        width={270}
      >
        {sidebarContent}
      </Drawer>

      {/* Desktop Sider */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid rgba(140, 140, 140, 0.2)',
          display: 'none',
        }}
        className="sidebar-desktop-container"
      >
        {sidebarContent}
      </div>

      <style jsx global>{`
        @media (min-width: 992px) {
          .sidebar-desktop-container {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};
