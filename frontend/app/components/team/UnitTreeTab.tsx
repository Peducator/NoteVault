'use client';

import React from 'react';
import { Card, Button, Tag, Space, Typography, Flex, Tooltip, Popconfirm, Empty } from 'antd';
import {
  ApartmentOutlined,
  PlusOutlined,
  DollarOutlined,
  RollbackOutlined,
  UserAddOutlined,
  DeleteOutlined,
  BankOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { formatVND } from '../../lib/format';
import { Unit } from '../../types/expense';

const { Text } = Typography;

export interface HierarchicalUnit extends Unit {
  depth?: number;
}

interface UnitTreeTabProps {
  units: HierarchicalUnit[];
  onOpenCreateModal: (parentUnit: Unit | null) => void;
  onOpenAllocateModal: (sourceUnit: Unit | null) => void;
  onOpenRecallModal: (sourceUnit: Unit) => void;
  onOpenAddMemberModal: (unit: Unit) => void;
  onDeleteUnit: (unitId: number) => void;
  currentUserRole?: string;
}

export const UnitTreeTab: React.FC<UnitTreeTabProps> = ({
  units,
  onOpenCreateModal,
  onOpenAllocateModal,
  onOpenRecallModal,
  onOpenAddMemberModal,
  onDeleteUnit,
  currentUserRole,
}) => {
  const isRoot = currentUserRole === 'ROOT';

  return (
    <Flex vertical gap="middle">
      {/* Top Banner & Actions */}
      <Card bordered>
        <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
          <div>
            <Text strong style={{ fontSize: 16 }}>Cơ cấu Cây Đơn Vị & Ngân Sách Phân Tầng</Text>
            <div style={{ fontSize: 12, color: 'gray' }}>
              Cấp Cha đóng vai trò két điều phối ngân sách • Nút Lá là nơi trực tiếp chi tiêu và quyết toán
            </div>
          </div>
          <Space>
            {isRoot && (
              <Button
                type="primary"
                style={{ backgroundColor: '#16a34a' }}
                icon={<DollarOutlined />}
                onClick={() => onOpenAllocateModal(null)}
              >
                Nạp vốn ROOT
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onOpenCreateModal(null)}
            >
              Thêm phòng ban gốc
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* Danh sách các nút cây đơn vị */}
      {units.length === 0 ? (
        <Card bordered>
          <Empty description="Chưa có đơn vị nào trong tổ chức" />
        </Card>
      ) : (
        <Flex vertical gap="small">
          {units.map((unit) => {
            const depth = unit.depth || 0;
            const safeBalance = Number(unit.safeBalance) || 0;
            const isLeaf = unit.isLeaf ?? (!unit.children || unit.children.length === 0);
            const memberCount = unit.members?.length || 0;

            return (
              <Card
                key={unit.id}
                bordered
                hoverable
                style={{
                  marginLeft: depth * 24,
                  borderLeft: depth > 0 ? '3px solid #2563eb' : undefined,
                }}
                styles={{ body: { padding: '14px 20px' } }}
              >
                <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
                  <Space align="center" size="middle">
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: depth === 0 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(140, 140, 140, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: depth === 0 ? '#2563eb' : '#64748b',
                        fontSize: 16,
                      }}
                    >
                      {depth === 0 ? <BankOutlined /> : <ApartmentOutlined />}
                    </div>

                    <Flex vertical gap={2}>
                      <Space size={6}>
                        <Text strong style={{ fontSize: 14 }}>{unit.name}</Text>
                        {depth === 0 && <Tag color="blue">Gốc (ROOT)</Tag>}
                        {isLeaf ? (
                          <Tag color="cyan">Đơn vị chi (Lá)</Tag>
                        ) : (
                          <Tag color="purple">Đơn vị cha (Két vốn)</Tag>
                        )}
                      </Space>

                      <Space size="middle" style={{ fontSize: 12, color: 'gray' }}>
                        <span>
                          Số dư an toàn: <strong style={{ color: '#16a34a' }}>{formatVND(safeBalance)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          <TeamOutlined /> {memberCount} nhân sự
                        </span>
                      </Space>
                    </Flex>
                  </Space>

                  <Space size="small" wrap>
                    <Tooltip title="Thêm đơn vị con">
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => onOpenCreateModal(unit)}
                      >
                        Thêm nhánh con
                      </Button>
                    </Tooltip>

                    <Tooltip title="Cấp ngân sách xuống cho đơn vị khác">
                      <Button
                        size="small"
                        type="primary"
                        icon={<DollarOutlined />}
                        onClick={() => onOpenAllocateModal(unit)}
                      >
                        Cấp vốn
                      </Button>
                    </Tooltip>

                    {unit.parentId !== null && (
                      <Tooltip title="Thu hồi ngân sách về đơn vị cấp trên">
                        <Button
                          size="small"
                          danger
                          icon={<RollbackOutlined />}
                          onClick={() => onOpenRecallModal(unit)}
                        >
                          Thu hồi
                        </Button>
                      </Tooltip>
                    )}

                    <Tooltip title="Gán thêm nhân viên vào đơn vị">
                      <Button
                        size="small"
                        icon={<UserAddOutlined />}
                        onClick={() => onOpenAddMemberModal(unit)}
                      >
                        Gán nhân sự
                      </Button>
                    </Tooltip>

                    {isRoot && (
                      <Popconfirm
                        title="Xóa đơn vị này?"
                        description="Chỉ có thể xóa đơn vị khi không có đơn vị con và số dư bằng 0."
                        onConfirm={() => onDeleteUnit(unit.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </Space>
                </Flex>
              </Card>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
};
