'use client';

import React, { useState } from 'react';
import {
  Table,
  Card,
  Input,
  Segmented,
  Tag,
  Button,
  Space,
  Modal,
  Typography,
  Flex,
  Image,
  Tooltip,
  App,
  Drawer,
  Descriptions,
  Divider,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  FileImageOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  ShopOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import { Expense } from '../types/expense';
import { formatVND } from '../lib/format';

const { Text, Title, Paragraph } = Typography;

interface ExpenseTableProps {
  expenses: Expense[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onViewAll?: () => void;
  onApprove?: (id: string) => Promise<any> | void;
  onReject?: (id: string, reason: string) => Promise<any> | void;
  onPay?: (id: string) => Promise<any> | void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isPaying?: boolean;
  currentUserId?: number;
  currentUserRole?: string;
}

type OrderStatusFilter = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED';

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  searchQuery,
  onSearchChange,
  onApprove,
  onReject,
  onPay,
  isApproving,
  isRejecting,
  isPaying,
  currentUserId,
  currentUserRole,
}) => {
  const { message } = App.useApp();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [internalQuery, setInternalQuery] = useState('');

  // Drawer detail state
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Rejection modal state
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false);

  const activeQuery = searchQuery !== undefined ? searchQuery : internalQuery;
  const handleQueryChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalQuery(val);
    }
  };

  const normalizeStatus = (status: string) => {
    if (status === 'PENDING' || status === 'SUBMITTED') return 'SUBMITTED';
    return status;
  };

  const submittedCount = expenses.filter((e) => normalizeStatus(e.approvalStatus) === 'SUBMITTED').length;
  const approvedCount = expenses.filter((e) => e.approvalStatus === 'APPROVED').length;
  const paidCount = expenses.filter((e) => e.approvalStatus === 'PAID').length;
  const rejectedCount = expenses.filter((e) => e.approvalStatus === 'REJECTED').length;

  const filteredExpenses = expenses.filter((exp) => {
    const norm = normalizeStatus(exp.approvalStatus);
    const matchStatus = statusFilter === 'ALL' || norm === statusFilter;
    const query = activeQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      exp.user.toLowerCase().includes(query) ||
      exp.purpose.toLowerCase().includes(query) ||
      exp.id.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query) ||
      (exp.vendorName && exp.vendorName.toLowerCase().includes(query)) ||
      (exp.unitName && exp.unitName.toLowerCase().includes(query));

    return matchStatus && matchQuery;
  });

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      message.error('Vui lòng nhập lý do từ chối (bắt buộc)');
      return;
    }
    try {
      setRejectionSubmitting(true);
      if (onReject && rejectingExpenseId) {
        await onReject(rejectingExpenseId, rejectionReason.trim());
        message.success('Đã từ chối khoản chi tiêu');
      }
      setRejectingExpenseId(null);
      setRejectionReason('');
      if (selectedExpense && selectedExpense.id === rejectingExpenseId) {
        setSelectedExpense((prev) => (prev ? { ...prev, approvalStatus: 'REJECTED', rejectionReason: rejectionReason.trim() } : null));
      }
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi từ chối');
    } finally {
      setRejectionSubmitting(false);
    }
  };

  const renderStatusTag = (status: string) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'SUBMITTED':
        return <Tag color="gold">Chờ duyệt</Tag>;
      case 'APPROVED':
        return <Tag color="green">Đã duyệt</Tag>;
      case 'PAID':
        return <Tag color="purple">Đã hoàn ứng</Tag>;
      case 'REJECTED':
        return <Tag color="red">Từ chối</Tag>;
      default:
        return <Tag>{norm}</Tag>;
    }
  };

  const columns: ColumnsType<Expense> = [
    {
      title: 'Mục đích & Mã GD',
      key: 'purpose',
      render: (_, record) => (
        <Flex
          vertical
          gap={2}
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedExpense(record)}
        >
          <Space size={4}>
            <Text strong style={{ color: '#1677ff' }}>{record.purpose}</Text>
            {record.scanStatus === 'CLEAN' && (
              <Tooltip title="Tệp an toàn (đã quét mã độc)">
                <SafetyCertificateOutlined style={{ color: '#16a34a' }} />
              </Tooltip>
            )}
            {record.scanStatus === 'INFECTED' && (
              <Tooltip title="Cảnh báo: Phát hiện mã độc">
                <AlertOutlined style={{ color: '#dc2626' }} />
              </Tooltip>
            )}
          </Space>
          <Space size={6}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.id}
            </Text>
            <Tag color="blue" style={{ fontSize: 10, lineHeight: '18px', padding: '0 4px' }}>
              {record.category}
            </Tag>
          </Space>
        </Flex>
      ),
    },
    {
      title: 'Người chi / Đơn vị',
      key: 'user',
      render: (_, record) => (
        <Flex vertical gap={1}>
          <Text strong style={{ fontSize: 13 }}>
            {record.user}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.unitName || 'Chung công ty'}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (val) => <Text style={{ fontSize: 12 }}>{val}</Text>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (val) => (
        <Text strong style={{ fontSize: 13 }} className="tabular-nums">
          {formatVND(val)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      render: (_, record) => renderStatusTag(record.approvalStatus),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const norm = normalizeStatus(record.approvalStatus);

        return (
          <Space size="small">
            <Tooltip title="Xem chi tiết phiếu chi">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setSelectedExpense(record)}
              />
            </Tooltip>

            {record.receiptUrl && (
              <Tooltip title="Xem hóa đơn chứng từ">
                <Image
                  src={record.receiptUrl}
                  alt="Hóa đơn"
                  width={28}
                  height={28}
                  style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                  preview={{
                    cover: <FileImageOutlined style={{ fontSize: 12 }} />,
                  }}
                />
              </Tooltip>
            )}

            {norm === 'SUBMITTED' && (
              <>
                {currentUserId && record.userId === currentUserId && currentUserRole !== 'ROOT' ? (
                  <Tag color="default" style={{ fontSize: 11 }}>Chờ cấp trên duyệt</Tag>
                ) : (
                  <>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      loading={isApproving}
                      onClick={() => onApprove && onApprove(record.id)}
                    >
                      Duyệt
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      loading={isRejecting}
                      onClick={() => {
                        setRejectingExpenseId(record.id);
                        setRejectionReason('');
                      }}
                    >
                      Từ chối
                    </Button>
                  </>
                )}
              </>
            )}

            {norm === 'APPROVED' && onPay && (
              <Button
                type="primary"
                size="small"
                style={{ backgroundColor: '#16a34a' }}
                icon={<DollarOutlined />}
                loading={isPaying}
                onClick={() => onPay(record.id)}
              >
                Hoàn ứng
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <Flex justify="space-between" align="center" wrap="wrap" gap="small">
          <div>
            <Text strong style={{ fontSize: 16 }}>Sổ cái chi tiêu & Phê duyệt</Text>
            <div style={{ fontSize: 12, color: 'gray', fontWeight: 'normal' }}>
              Phê duyệt trực tiếp bởi Quản lý đơn vị • Lưu vết kiểm toán minh bạch
            </div>
          </div>
          <Input
            prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            placeholder="Tìm mã GD, người chi, đơn vị, đơn vị bán..."
            value={activeQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
        </Flex>
      }
      extra={
        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <Segmented<OrderStatusFilter>
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { label: `Tất cả (${expenses.length})`, value: 'ALL' },
              { label: `Chờ duyệt (${submittedCount})`, value: 'SUBMITTED' },
              { label: `Đã duyệt (${approvedCount})`, value: 'APPROVED' },
              { label: `Đã hoàn ứng (${paidCount})`, value: 'PAID' },
              { label: `Từ chối (${rejectedCount})`, value: 'REJECTED' },
            ]}
          />
        </div>
      }
    >
      <Table<Expense>
        columns={columns}
        dataSource={filteredExpenses}
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: true }}
        scroll={{ x: 750 }}
      />

      {/* Drawer xem chi tiết khoản chi tiêu */}
      <Drawer
        title={
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Space>
              <Text strong style={{ fontSize: 16 }}>
                Chi tiết khoản chi: {selectedExpense?.id}
              </Text>
              {selectedExpense && renderStatusTag(selectedExpense.approvalStatus)}
            </Space>
          </Flex>
        }
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        size={540}
        destroyOnHidden
        extra={
          selectedExpense && normalizeStatus(selectedExpense.approvalStatus) === 'SUBMITTED' ? (
            currentUserId && selectedExpense.userId === currentUserId && currentUserRole !== 'ROOT' ? (
              <Tag color="gold">Đang chờ cấp trên duyệt</Tag>
            ) : (
              <Space>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={isApproving}
                  onClick={async () => {
                    if (onApprove) {
                      await onApprove(selectedExpense.id);
                      setSelectedExpense(null);
                    }
                  }}
                >
                  Phê duyệt
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setRejectingExpenseId(selectedExpense.id);
                    setRejectionReason('');
                  }}
                >
                  Từ chối
                </Button>
              </Space>
            )
          ) : selectedExpense && normalizeStatus(selectedExpense.approvalStatus) === 'APPROVED' && onPay ? (
            <Button
              type="primary"
              style={{ backgroundColor: '#16a34a' }}
              icon={<DollarOutlined />}
              loading={isPaying}
              onClick={async () => {
                await onPay(selectedExpense.id);
                setSelectedExpense(null);
              }}
            >
              Hoàn ứng ngay
            </Button>
          ) : null
        }
      >
        {selectedExpense && (
          <Flex vertical gap="middle">
            {/* Banner số tiền nổi bật */}
            <Card
              size="small"
              style={{
                background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)',
                borderColor: '#91caff',
                textAlign: 'center',
                padding: '12px 0',
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                TỔNG SỐ TIỀN CHI TIÊU
              </Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0958d9', margin: '4px 0' }}>
                {formatVND(selectedExpense.amount)}
              </div>
              <Text strong style={{ fontSize: 14 }}>
                {selectedExpense.purpose}
              </Text>
            </Card>

            {/* Cảnh báo lý do từ chối nếu có */}
            {selectedExpense.rejectionReason && (
              <Alert
                message="Lý do từ chối"
                description={selectedExpense.rejectionReason}
                type="error"
                showIcon
              />
            )}

            {/* Chi tiết thông tin giao dịch */}
            <Descriptions
              title="Thông tin phiếu chi"
              bordered
              size="small"
              column={1}
            >
              <Descriptions.Item label="Người thực hiện chi">
                <Space>
                  <UserOutlined />
                  <Text strong>{selectedExpense.user}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Đơn vị / Phòng ban">
                {selectedExpense.unitName || 'Toàn công ty'}
              </Descriptions.Item>

              <Descriptions.Item label="Danh mục chi phí">
                <Tag color="blue">{selectedExpense.category}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Ngày lập / Ngày chi">
                <Space>
                  <CalendarOutlined />
                  <span>{selectedExpense.date}</span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Quét mã độc S3">
                {selectedExpense.scanStatus === 'CLEAN' ? (
                  <Tag color="success" icon={<SafetyCertificateOutlined />}>
                    Đã kiểm tra an toàn (CLEAN)
                  </Tag>
                ) : selectedExpense.scanStatus === 'INFECTED' ? (
                  <Tag color="error" icon={<AlertOutlined />}>
                    Phát hiện mã độc
                  </Tag>
                ) : (
                  <Tag color="default">Chờ kiểm tra</Tag>
                )}
              </Descriptions.Item>

              {selectedExpense.vendorName && (
                <Descriptions.Item label="Đơn vị bán hàng">
                  <Space>
                    <ShopOutlined />
                    <Text strong>{selectedExpense.vendorName}</Text>
                  </Space>
                </Descriptions.Item>
              )}

              {selectedExpense.taxCode && (
                <Descriptions.Item label="Mã số thuế (MST)">
                  <Space>
                    <BarcodeOutlined />
                    <Text code>{selectedExpense.taxCode}</Text>
                  </Space>
                </Descriptions.Item>
              )}

              {selectedExpense.invoiceNumber && (
                <Descriptions.Item label="Số hóa đơn">
                  <Text code>{selectedExpense.invoiceNumber}</Text>
                </Descriptions.Item>
              )}

              {selectedExpense.vatAmount !== undefined && (
                <Descriptions.Item label="Tiền thuế VAT">
                  {formatVND(selectedExpense.vatAmount)}
                </Descriptions.Item>
              )}

              {selectedExpense.approverName && (
                <Descriptions.Item label="Người phê duyệt">
                  <Text strong style={{ color: '#16a34a' }}>
                    {selectedExpense.approverName}
                  </Text>
                  {selectedExpense.approvedAt && ` • ${selectedExpense.approvedAt}`}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Ảnh hóa đơn / Chứng từ gốc */}
            <Divider titlePlacement="start" style={{ margin: '8px 0' }}>
              Chứng từ & Hóa đơn gốc
            </Divider>

            {selectedExpense.receiptUrl ? (
              <Flex vertical align="center" gap="small">
                <Image
                  src={selectedExpense.receiptUrl}
                  alt="Ảnh hóa đơn"
                  style={{
                    maxHeight: 280,
                    objectFit: 'contain',
                    borderRadius: 8,
                    border: '1px solid #d9d9d9',
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Nhấp vào ảnh để phóng to, xoay ảnh và đối soát
                </Text>
              </Flex>
            ) : (
              <Card size="small" style={{ textAlign: 'center', background: '#fafafa' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Khoản chi này không đính kèm tệp ảnh hóa đơn.
                </Text>
              </Card>
            )}
          </Flex>
        )}
      </Drawer>

      {/* Modal từ chối khoản chi */}
      <Modal
        title="Từ chối khoản chi tiêu"
        open={!!rejectingExpenseId}
        onOk={handleConfirmReject}
        confirmLoading={rejectionSubmitting}
        onCancel={() => {
          setRejectingExpenseId(null);
          setRejectionReason('');
        }}
        okText="Xác nhận từ chối"
        cancelText="Đóng"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Flex vertical gap="small" style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Vui lòng nhập lý do từ chối để nhân viên biết nguyên nhân và chỉnh sửa nếu cần:
          </Text>
          <Input.TextArea
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Ví dụ: Thiếu hóa đơn VAT hợp lệ, sai đơn vị thụ hưởng..."
          />
        </Flex>
      </Modal>
    </Card>
  );
};
