'use client';

import React, { useState } from 'react';
import { Table, Card, Button, Modal, Select, Radio, Typography, Flex, Space, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, UserAddOutlined } from '@ant-design/icons';
import { JoinRequest, Unit } from '../../types/expense';

const { Text } = Typography;

interface JoinRequestsTabProps {
  joinRequests: JoinRequest[];
  units: Unit[];
  onApprove: (requestId: string, role: 'MEMBER' | 'ROOT', unitId?: number) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

export const JoinRequestsTab: React.FC<JoinRequestsTabProps> = ({
  joinRequests,
  units,
  onApprove,
  onReject,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [approveRole, setApproveRole] = useState<'MEMBER' | 'ROOT'>('MEMBER');
  const [approveUnitId, setApproveUnitId] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenApproveModal = (req: JoinRequest) => {
    setSelectedRequest(req);
    setApproveRole('MEMBER');
    setApproveUnitId(req.unitId || (units[0]?.id));
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    try {
      setIsSubmitting(true);
      await onApprove(selectedRequest.requestId, approveRole, approveUnitId);
      setSelectedRequest(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnsType<JoinRequest> = [
    {
      title: 'Họ tên & Email',
      key: 'user',
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Text strong>{record.name || 'Chưa đặt tên'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.email}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Nguyện vọng đơn vị',
      dataIndex: 'unitName',
      key: 'unitName',
      render: (val) => <Text>{val || 'Chung công ty'}</Text>,
    },
    {
      title: 'Thời gian đăng ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {date ? new Date(date).toLocaleString('vi-VN') : '—'}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            style={{ backgroundColor: '#16a34a' }}
            icon={<CheckOutlined />}
            onClick={() => handleOpenApproveModal(record)}
          >
            Duyệt gia nhập
          </Button>

          <Popconfirm
            title="Từ chối đơn xin gia nhập này?"
            onConfirm={() => onReject(record.requestId)}
            okText="Từ chối"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<CloseOutlined />}>
              Từ chối
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      bordered
      title={
        <div>
          <Text strong style={{ fontSize: 16 }}>Hàng Đợi Đơn Xin Gia Nhập Doanh Nghiệp</Text>
          <div style={{ fontSize: 12, color: 'gray' }}>
            Xét duyệt nhân sự mới đăng ký và phân bổ trực tiếp vào phòng ban
          </div>
        </div>
      }
    >
      <Table<JoinRequest>
        columns={columns}
        dataSource={joinRequests}
        rowKey="requestId"
        pagination={{ pageSize: 8, showSizeChanger: true }}
      />

      {/* Modal xét duyệt */}
      <Modal
        title={
          <Flex align="center" gap="small">
            <UserAddOutlined style={{ color: '#16a34a' }} />
            <span>Duyệt nhân viên: {selectedRequest?.name || selectedRequest?.email}</span>
          </Flex>
        }
        open={!!selectedRequest}
        onOk={handleConfirmApprove}
        confirmLoading={isSubmitting}
        onCancel={() => setSelectedRequest(null)}
        okText="Xác nhận phê duyệt"
        cancelText="Hủy"
        destroyOnClose
      >
        <Flex vertical gap="middle" style={{ padding: '12px 0' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Chọn phòng ban tiếp nhận
            </Text>
            <Select
              style={{ width: '100%' }}
              value={approveUnitId}
              onChange={(val) => setApproveUnitId(val)}
              options={units.map((u) => ({
                value: u.id,
                label: u.name,
              }))}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Phân quyền tài khoản
            </Text>
            <Radio.Group
              value={approveRole}
              onChange={(e) => setApproveRole(e.target.value)}
            >
              <Radio value="MEMBER">Thành viên (MEMBER)</Radio>
              <Radio value="ROOT">Quản trị cấp cao (ROOT)</Radio>
            </Radio.Group>
          </div>
        </Flex>
      </Modal>
    </Card>
  );
};
