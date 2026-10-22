'use client';

import React, { useState } from 'react';
import { Table, Card, Button, Tag, Segmented, Space, Modal, Input, Typography, Flex, Tooltip, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  ForwardOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { formatVND } from '../../lib/format';
import { AllocationRequestItem, allocationRequestApi } from '../../apis/allocationRequestApi';
import { Unit } from '../../types/expense';

const { Text } = Typography;

interface AllocationRequestsTabProps {
  requests: AllocationRequestItem[];
  units: Unit[];
  currentUserId?: number;
  onRefresh: () => void;
  onOpenCreateRequestModal: () => void;
  onOpenFundModal: (req: AllocationRequestItem) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const AllocationRequestsTab: React.FC<AllocationRequestsTabProps> = ({
  requests,
  onRefresh,
  onOpenCreateRequestModal,
  onOpenFundModal,
  onToast,
}) => {
  const { message } = App.useApp();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [rejectingReqId, setRejectingReqId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<number | null>(null);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const handleLock = async (req: AllocationRequestItem) => {
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.lockRequest(req.id);
      if (res.success) {
        message.success('Đã nhận xử lý yêu cầu (Khóa bảo vệ 5 phút)');
        onRefresh();
      } else {
        message.error(res.message || 'Không thể khóa yêu cầu');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi khóa yêu cầu');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleUnlock = async (req: AllocationRequestItem) => {
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.unlockRequest(req.id);
      if (res.success) {
        message.success('Đã mở khóa yêu cầu');
        onRefresh();
      } else {
        message.error(res.message || 'Không thể mở khóa');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi mở khóa');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleForward = async (req: AllocationRequestItem) => {
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.forwardRequest(req.id);
      if (res.success) {
        message.success('Đã chuyển tiếp yêu cầu lên đơn vị cấp trên');
        onRefresh();
      } else {
        message.error(res.message || 'Không thể chuyển tiếp');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi chuyển tiếp');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleCancel = async (req: AllocationRequestItem) => {
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.cancelRequest(req.id);
      if (res.success) {
        message.success('Đã hủy bỏ yêu cầu xin cấp ngân sách');
        onRefresh();
      } else {
        message.error(res.message || 'Không thể hủy yêu cầu');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi hủy yêu cầu');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      message.error('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setIsSubmittingReject(true);
      if (rejectingReqId) {
        const res = await allocationRequestApi.rejectRequest(rejectingReqId, rejectReason.trim());
        if (res.success) {
          message.success('Đã từ chối yêu cầu xin cấp ngân sách');
          onRefresh();
          setRejectingReqId(null);
          setRejectReason('');
        } else {
          message.error(res.message || 'Không thể từ chối');
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi từ chối');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const columns: ColumnsType<AllocationRequestItem> = [
    {
      title: 'Mã & Lý do',
      key: 'reason',
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Text strong>{record.reason}</Text>
          <Space size={6}>
            <Text code style={{ fontSize: 11 }}>REQ#{record.id}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(record.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </Space>
        </Flex>
      ),
    },
    {
      title: 'Đơn vị xin cấp',
      key: 'destinationUnit',
      render: (_, record) => (
        <Tag color="blue">{record.destinationUnit?.name || `Đơn vị #${record.destinationUnitId}`}</Tag>
      ),
    },
    {
      title: 'Số tiền xin cấp',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
      render: (amount) => (
        <Text strong className="tabular-nums" style={{ color: '#1e3a8a', fontSize: 13 }}>
          {formatVND(Number(amount))}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => {
        switch (status) {
          case 'PENDING':
            return <Tag color="gold">Chờ phê duyệt</Tag>;
          case 'ALLOCATING':
            return <Tag color="orange" icon={<LockOutlined />}>Đang xử lý</Tag>;
          case 'FORWARDED':
            return <Tag color="cyan" icon={<ForwardOutlined />}>Đã chuyển tiếp</Tag>;
          case 'APPROVED':
            return <Tag color="green" icon={<CheckCircleOutlined />}>Đã giải ngân</Tag>;
          case 'REJECTED':
            return <Tag color="red" icon={<CloseOutlined />}>Từ chối</Tag>;
          case 'CANCELLED':
            return <Tag color="default">Đã hủy</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const isLoading = loadingActionId === record.id;
        const isPendingOrLocked = record.status === 'PENDING' || record.status === 'ALLOCATING';

        return (
          <Space size="small" wrap>
            {record.status === 'PENDING' && (
              <Button
                size="small"
                icon={<LockOutlined />}
                loading={isLoading}
                onClick={() => handleLock(record)}
              >
                Nhận xử lý
              </Button>
            )}

            {record.status === 'ALLOCATING' && (
              <>
                <Button
                  size="small"
                  type="primary"
                  style={{ backgroundColor: '#16a34a' }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => onOpenFundModal(record)}
                >
                  Giải ngân
                </Button>
                <Button
                  size="small"
                  icon={<ForwardOutlined />}
                  loading={isLoading}
                  onClick={() => handleForward(record)}
                >
                  Chuyển tiếp
                </Button>
                <Button
                  size="small"
                  icon={<UnlockOutlined />}
                  loading={isLoading}
                  onClick={() => handleUnlock(record)}
                >
                  Mở khóa
                </Button>
              </>
            )}

            {isPendingOrLocked && (
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setRejectingReqId(record.id);
                  setRejectReason('');
                }}
              >
                Từ chối
              </Button>
            )}

            {record.status === 'PENDING' && (
              <Tooltip title="Hủy bỏ yêu cầu này">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={isLoading}
                  onClick={() => handleCancel(record)}
                />
              </Tooltip>
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
            <Text strong style={{ fontSize: 16 }}>Danh Sách Yêu Cầu Cấp Ngân Sách</Text>
            <div style={{ fontSize: 12, color: 'gray' }}>
              Quy trình phân tầng CAS: Nhận xử lý ➔ Giải ngân / Chuyển tiếp / Từ chối
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreateRequestModal}
          >
            Lập yêu cầu mới
          </Button>
        </Flex>
      }
      extra={
        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <Segmented
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as string)}
            options={[
              { label: 'Tất cả', value: 'ALL' },
              { label: 'Chờ duyệt', value: 'PENDING' },
              { label: 'Đang xử lý', value: 'ALLOCATING' },
              { label: 'Đã giải ngân', value: 'APPROVED' },
              { label: 'Từ chối', value: 'REJECTED' },
            ]}
          />
        </div>
      }
    >
      <Table<AllocationRequestItem>
        columns={columns}
        dataSource={Array.isArray(filteredRequests) ? filteredRequests : []}
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: true }}
        scroll={{ x: 750 }}
      />

      {/* Modal từ chối yêu cầu */}
      <Modal
        title="Từ chối yêu cầu cấp ngân sách"
        open={!!rejectingReqId}
        onOk={handleConfirmReject}
        confirmLoading={isSubmittingReject}
        onCancel={() => {
          setRejectingReqId(null);
          setRejectReason('');
        }}
        okText="Xác nhận từ chối"
        cancelText="Đóng"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Flex vertical gap="small" style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Vui lòng nhập lý do từ chối để đơn vị cấp dưới nắm thông tin:
          </Text>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ví dụ: Vượt quá hạn mức dự kiến quý 4, yêu cầu giải trình thêm..."
          />
        </Flex>
      </Modal>
    </Card>
  );
};
