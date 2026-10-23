'use client';

import React from 'react';
import { Layout, Menu, Avatar, Tag, Button, Flex, Typography, Drawer, Divider, theme } from 'antd';
import {
  DashboardOutlined,
  FileDoneOutlined,
  ApartmentOutlined,
  TeamOutlined,
  FileTextOutlined,
  LogoutOutlined,
  BankOutlined,
  SafetyCertificateFilled,
  CloseOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

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
  const { token } = theme.useToken();
  const displayUnit = unitName || departmentName || 'Đơn vị';

  const menuItems = [
    { key: 'overview', icon: <DashboardOutlined style={{ fontSize: 16 }} />, label: 'Sổ cái & Chi tiêu' },
    { key: 'expenses', icon: <FileDoneOutlined style={{ fontSize: 16 }} />, label: 'Hóa đơn & Chứng từ' },
    { key: 'units', icon: <ApartmentOutlined style={{ fontSize: 16 }} />, label: 'Cây Đơn Vị & Ngân Sách' },
    { key: 'users', icon: <TeamOutlined style={{ fontSize: 16 }} />, label: 'Thành viên tổ chức' },
    { key: 'categories', icon: <TagsOutlined style={{ fontSize: 16 }} />, label: 'Danh mục chi phí' },
    { key: 'banking', icon: <BankOutlined style={{ fontSize: 16 }} />, label: 'Tài khoản hoàn ứng' },
  ];

  const sidebarContent = (
    <Flex vertical style={{ height: '100%', padding: '20px 16px', overflowY: 'auto' }} justify="space-between">
      {/* Top branding & organization context */}
      <Flex vertical gap="middle">
        <Flex align="center" justify="space-between">
          <Flex align="center" gap="small">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: token.colorPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 18,
              }}
            >
              <SafetyCertificateFilled />
            </div>
            <Flex vertical>
              <Text strong style={{ fontSize: '16px', letterSpacing: '-0.3px', color: token.colorText, lineHeight: 1.2 }}>
                NoteVault
              </Text>
              <Text type="secondary" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Treasury Engine
              </Text>
            </Flex>
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

        {/* Tenant Box - Crisp institutional styling */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${token.colorBorder}`,
            background: token.colorFillSecondary,
          }}
        >
          <Flex align="center" justify="space-between" style={{ marginBottom: 4 }}>
            <Flex align="center" gap={6}>
              <BankOutlined style={{ fontSize: '13px', color: token.colorPrimary }} />
              <Text strong ellipsis style={{ fontSize: '12px', color: token.colorText }}>
                {tenantName}
              </Text>
            </Flex>
            {userRole === 'ROOT' && (
              <Tag color="purple" style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                ROOT
              </Tag>
            )}
          </Flex>
          <Text type="secondary" ellipsis style={{ fontSize: '11px', display: 'block' }}>
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
          style={{
            border: 'none',
            background: 'transparent',
            fontWeight: 500,
            fontSize: '13px',
          }}
        />
      </Flex>

      {/* Footer User Info & Actions */}
      <Flex vertical gap="small">
        <Divider style={{ margin: '12px 0', borderColor: token.colorBorderSecondary }} />
        
        <Flex align="center" gap="small" style={{ padding: '4px 6px', overflow: 'hidden' }}>
          <Avatar
            style={{
              backgroundColor: token.colorPrimary,
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              width: 32,
              height: 32,
              flexShrink: 0,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </Avatar>
          <Flex vertical style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
            <Text strong ellipsis style={{ fontSize: '12px', color: token.colorText }}>
              {userName}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {userRole === 'ROOT' ? 'Quản trị tối cao' : 'Thành viên'}
            </Text>
          </Flex>
        </Flex>

        <Link href="/docs" target="_blank" style={{ width: '100%', marginTop: 4 }}>
          <Button icon={<FileTextOutlined />} block size="small" style={{ fontSize: 12, borderRadius: 6 }}>
            Tài liệu API & Đối soát
          </Button>
        </Link>

        <Button
          danger
          type="text"
          icon={<LogoutOutlined />}
          block
          size="small"
          style={{ fontSize: 12, textAlign: 'left', justifyContent: 'flex-start' }}
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
        size={270}
      >
        {sidebarContent}
      </Drawer>

      {/* Desktop Sider */}
      <Sider
        width={250}
        className="sidebar-desktop-container"
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          background: token.colorBgContainer,
        }}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={0}
      >
        {sidebarContent}
      </Sider>

      <style jsx global>{`
        @media (max-width: 991px) {
          .sidebar-desktop-container {
            display: none !important;
          }
        }
        .ant-menu-item-selected {
          font-weight: 600 !important;
          color: ${token.colorPrimary} !important;
        }
      `}</style>
    </>
  );
};
