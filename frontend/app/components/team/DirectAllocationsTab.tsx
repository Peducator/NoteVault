'use client';

import React from 'react';
import { Table, Card, Button, Tag, Typography, Flex, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ArrowRightOutlined, RollbackOutlined, DollarOutlined } from '@ant-design/icons';
import { formatVND } from '../../lib/format';
import { Allocation, Unit } from '../../types/expense';

const { Text } = Typography;

interface DirectAllocationsTabProps {
  allocations: Allocation[];
  units: Unit[];
  onOpenAllocateModal: () => void;
  onOpenRecallModal: (unit: Unit) => void;
}

export const DirectAllocationsTab: React.FC<DirectAllocationsTabProps> = ({
  allocations,
  units,
  onOpenAllocateModal,
}) => {
  const unitMap = new Map(units.map((u) => [u.id, u]));

  const columns: ColumnsType<Allocation> = [
    {
      title: 'Mã GD',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => <Text code>{id}</Text>,
    },
    {
      title: 'Loại điều chuyển',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type) => {
        if (type === 'RECALL') {
          return <Tag color="warning" icon={<RollbackOutlined />}>THU HỒI</Tag>;
        }
        return <Tag color="success" icon={<DollarOutlined />}>CẤP PHÁT</Tag>;
      },
    },
    {
      title: 'Dòng tiền (Nguồn ➔ Đích)',
      key: 'flow',
      render: (_, record) => {
        const sourceName = record.sourceUnitId
          ? unitMap.get(record.sourceUnitId)?.name || `Đơn vị #${record.sourceUnitId}`
          : 'Quỹ ROOT Công ty';
        const targetName = record.targetUnitId
          ? unitMap.get(record.targetUnitId)?.name || `Đơn vị #${record.targetUnitId}`
          : 'Quỹ ROOT';

        return (
          <Space>
            <Tag>{sourceName}</Tag>
            <ArrowRightOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
            <Tag color="blue">{targetName}</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Số tiền (VND)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
      render: (amount, record) => {
        const isRecall = record.type === 'RECALL';
        return (
          <Text strong style={{ color: isRecall ? '#d97706' : '#16a34a', fontSize: 13 }}>
            {isRecall ? `-${formatVND(Number(amount))}` : `+${formatVND(Number(amount))}`}
          </Text>
        );
      },
    },
    {
      title: 'Ghi chú / Quyết định',
      dataIndex: 'note',
      key: 'note',
      render: (note, record) => (
        <Text type="secondary" ellipsis style={{ maxWidth: 220, display: 'inline-block' }}>
          {note || record.reason || '—'}
        </Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {date ? new Date(date).toLocaleString('vi-VN') : '—'}
        </Text>
      ),
    },
  ];

  return (
    <Card
      bordered
      title={
        <Flex justify="space-between" align="center" wrap="wrap" gap="small">
          <div>
            <Text strong style={{ fontSize: 16 }}>Sổ Cái Cấp Phát & Thu Hồi Ngân Sách</Text>
            <div style={{ fontSize: 12, color: 'gray' }}>
              Sổ cái bất biến ghi nhận mọi dòng tiền điều phối giữa các phòng ban
            </div>
          </div>
          <Button
            type="primary"
            style={{ backgroundColor: '#16a34a' }}
            icon={<PlusOutlined />}
            onClick={onOpenAllocateModal}
          >
            Cấp ngân sách
          </Button>
        </Flex>
      }
    >
      <Table<Allocation>
        columns={columns}
        dataSource={allocations}
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: true }}
        scroll={{ x: 750 }}
      />
    </Card>
  );
};
