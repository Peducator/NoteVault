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
} from '@ant-design/icons';
import { Expense } from '../types/expense';
import { formatVND } from '../lib/format';

const { Text } = Typography;

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
}) => {
  const { message } = App.useApp();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [internalQuery, setInternalQuery] = useState('');

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
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi từ chối');
    } finally {
      setRejectionSubmitting(false);
    }
  };

  const columns: ColumnsType<Expense> = [
    {
      title: 'Mục đích & Mã GD',
      key: 'purpose',
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Space size={4}>
            <Text strong>{record.purpose}</Text>
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
        <Text strong style={{ fontSize: 13 }}>
          {formatVND(val)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      render: (_, record) => {
        const norm = normalizeStatus(record.approvalStatus);
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
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const norm = normalizeStatus(record.approvalStatus);

        return (
          <Space size="small">
            {record.receiptUrl && (
              <Tooltip title="Xem hóa đơn chứng từ">
                <Image
                  src={record.receiptUrl}
                  alt="Hóa đơn"
                  width={28}
                  height={28}
                  style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                  preview={{
                    mask: <FileImageOutlined style={{ fontSize: 12 }} />,
                  }}
                />
              </Tooltip>
            )}

            {norm === 'SUBMITTED' && (
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
      bordered
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
            placeholder="Tìm mã GD, người chi, đơn vị..."
            value={activeQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            style={{ width: 260 }}
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
        scroll={{ x: 700 }}
      />

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
