'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flex,
  Button,
  Typography,
  Badge,
  Space,
  Tooltip,
  Popover,
  List,
  Tag,
  Empty,
  Spin,
  theme,
  App,
} from 'antd';
import {
  MenuOutlined,
  PlusOutlined,
  LogoutOutlined,
  BellOutlined,
  BankOutlined,
  TagsOutlined,
  CheckOutlined,
  InboxOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { ThemeToggle } from './ThemeToggle';
import { notificationApi, NotificationItem } from '../apis/notificationApi';
import { BankingModal } from './BankingModal';
import { CategoryManagementModal } from './CategoryManagementModal';

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
  const { message } = App.useApp();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  // Modals state
  const [isBankingModalOpen, setIsBankingModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications({ limit: 15 });
      if (res.success && res.data) {
        const items = res.data.items || res.data.notifications || (Array.isArray(res.data) ? res.data : []);
        setNotifications(items);
        setUnreadCount(typeof res.data.unreadCount === 'number' ? res.data.unreadCount : items.filter((n: any) => !n.isRead).length);
      }
    } catch {
      // Ignore background notification fetch errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    try {
      await notificationApi.markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      message.error(err.message || 'Không thể cập nhật thông báo');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsLoadingNotifs(true);
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      message.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (err: any) {
      message.error(err.message || 'Không thể đánh dấu đã đọc');
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const notificationPopoverContent = (
    <div style={{ width: 340, maxHeight: 420, display: 'flex', flexDirection: 'column' }}>
      <Flex justify="space-between" align="center" style={{ paddingBottom: 10, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Space size="small">
          <Text strong style={{ fontSize: 14 }}>Thông báo</Text>
          {unreadCount > 0 && <Tag color="error">{unreadCount} mới</Tag>}
        </Space>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleMarkAllAsRead}
            style={{ padding: 0, fontSize: 12 }}
          >
            Đọc tất cả
          </Button>
        )}
      </Flex>

      <div style={{ overflowY: 'auto', flex: 1, maxHeight: 350, marginTop: 8 }}>
        {notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có thông báo nào"
            style={{ padding: '24px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                onClick={() => handleMarkAsRead(item)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  backgroundColor: item.isRead ? 'transparent' : 'rgba(22, 119, 255, 0.05)',
                  marginBottom: 4,
                  transition: 'background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Flex justify="space-between" align="center" style={{ width: '100%', marginBottom: 4 }}>
                  <Space size={6}>
                    {!item.isRead && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: '#1677ff',
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <Text strong style={{ fontSize: 13, color: token.colorText }}>
                      {item.title}
                    </Text>
                  </Space>
                  <Tag
                    color={
                      item.type?.includes('APPROVED')
                        ? 'green'
                        : item.type?.includes('REJECTED')
                        ? 'red'
                        : 'blue'
                    }
                    style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '18px' }}
                  >
                    {item.type || 'Hệ thống'}
                  </Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 4 }}>
                  {item.message}
                </Text>
                <Space size={4} style={{ fontSize: 11, color: token.colorTextSecondary }}>
                  <ClockCircleOutlined style={{ fontSize: 10 }} />
                  <span>{formatTime(item.createdAt)}</span>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
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
                {isSyncing ? 'Đang đồng bộ...' : 'Trực tuyến'}
              </span>
            }
          />

          {/* Quick Action: Category Management */}
          <Tooltip title="Quản lý danh mục chi phí">
            <Button
              type="text"
              icon={<TagsOutlined style={{ fontSize: 16 }} />}
              onClick={() => setIsCategoryModalOpen(true)}
              className="header-icon-btn"
            />
          </Tooltip>

          {/* Quick Action: Personal Banking Information */}
          <Tooltip title="Cài đặt tài khoản ngân hàng nhận tiền">
            <Button
              type="text"
              icon={<BankOutlined style={{ fontSize: 16 }} />}
              onClick={() => setIsBankingModalOpen(true)}
              className="header-icon-btn"
            />
          </Tooltip>

          {/* Notification Center */}
          <Popover
            content={notificationPopoverContent}
            trigger="click"
            open={isNotifOpen}
            onOpenChange={(open) => {
              setIsNotifOpen(open);
              if (open) fetchNotifications();
            }}
            placement="bottomRight"
          >
            <Tooltip title="Thông báo hệ thống">
              <Badge count={unreadCount} size="small" offset={[-2, 4]}>
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 17 }} />}
                  className="header-icon-btn"
                />
              </Badge>
            </Tooltip>
          </Popover>

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

      {/* Cửa sổ quản lý danh mục chi phí */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Cửa sổ thông tin tài khoản ngân hàng cá nhân */}
      <BankingModal
        isOpen={isBankingModalOpen}
        onClose={() => setIsBankingModalOpen(false)}
      />
    </>
  );
};
