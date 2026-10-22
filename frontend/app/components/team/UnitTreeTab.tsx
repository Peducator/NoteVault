'use client';

import React, { useMemo } from 'react';
import { Card, Button, Tag, Space, Typography, Flex, Tooltip, Popconfirm, Empty, Spin, theme } from 'antd';
import {
  ApartmentOutlined,
  PlusOutlined,
  DollarOutlined,
  RollbackOutlined,
  UserAddOutlined,
  DeleteOutlined,
  BankOutlined,
  TeamOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { formatVND } from '../../lib/format';
import { Unit } from '../../types/expense';

const { Text } = Typography;

export interface HierarchicalUnit extends Unit {
  depth?: number;
}

interface UnitTreeTabProps {
  units: HierarchicalUnit[];
  isLoading?: boolean;
  onOpenCreateModal: (parentUnit: Unit | null) => void;
  onOpenAllocateModal: (sourceUnit: Unit | null) => void;
  onOpenRecallModal: (sourceUnit: Unit) => void;
  onOpenAddMemberModal: (unit: Unit) => void;
  onDeleteUnit: (unitId: number) => void;
  currentUserRole?: string;
}

export const UnitTreeTab: React.FC<UnitTreeTabProps> = ({
  units,
  isLoading = false,
  onOpenCreateModal,
  onOpenAllocateModal,
  onOpenRecallModal,
  onOpenAddMemberModal,
  onDeleteUnit,
  currentUserRole,
}) => {
  const { token } = theme.useToken();
  const isRoot = currentUserRole === 'ROOT';

  const stats = useMemo(() => {
    let totalSafeBalance = 0;
    let totalMembers = 0;
    let leafCount = 0;

    for (const u of units) {
      totalSafeBalance += Number(u.safeBalance) || 0;
      totalMembers += u.members?.length || 0;
      const isLeaf = u.isLeaf ?? (!u.children || u.children.length === 0);
      if (isLeaf) leafCount++;
    }

    return { totalSafeBalance, totalMembers, leafCount, totalUnits: units.length };
  }, [units]);

  return (
    <Flex vertical gap="middle">
      {/* Top Treasury Summary & Actions */}
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
          <div>
            <Flex align="center" gap="small">
              <BankOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
              <Text strong style={{ fontSize: 16 }}>
                Cơ cấu Cây Đơn Vị & Ngân Sách Phân Tầng
              </Text>
            </Flex>
            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
              Cấp Cha đóng vai trò két điều phối ngân sách • Nút Lá là nơi trực tiếp chi tiêu và quyết toán
            </div>
            <Flex gap="small" wrap="wrap" style={{ marginTop: 10 }}>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: token.colorFillAlter,
                  border: `1px solid ${token.colorBorder}`,
                  fontSize: 12,
                }}
              >
                <Text type="secondary">Tổng quy mô: </Text>
                <strong>{stats.totalUnits}</strong> đơn vị (<strong>{stats.leafCount}</strong> đơn vị chi)
              </div>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: token.colorFillAlter,
                  border: `1px solid ${token.colorBorder}`,
                  fontSize: 12,
                }}
              >
                <Text type="secondary">Nhân sự phân bổ: </Text>
                <strong>{stats.totalMembers}</strong> thành viên
              </div>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: token.colorFillAlter,
                  border: `1px solid ${token.colorBorder}`,
                  fontSize: 12,
                }}
              >
                <Text type="secondary">Tổng quỹ an toàn: </Text>
                <strong className="tabular-nums" style={{ color: token.colorSuccess }}>
                  {formatVND(stats.totalSafeBalance)}
                </strong>
              </div>
            </Flex>
          </div>

          <Space wrap>
            {isRoot && (
              <Button
                type="primary"
                style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
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

      {/* Directory Hierarchy Ledger */}
      {isLoading ? (
        <Card>
          <Flex justify="center" align="center" style={{ padding: 48 }}>
            <Spin size="large" description="Đang tải cấu trúc đơn vị..." />
          </Flex>
        </Card>
      ) : units.length === 0 ? (
        <Card>
          <Empty description="Chưa có đơn vị nào trong tổ chức" />
        </Card>
      ) : (
        <Card
          styles={{ body: { padding: 0 } }}
          style={{ overflow: 'hidden' }}
        >
          {/* Header Row */}
          <div
            className="unit-ledger-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              backgroundColor: token.colorFillAlter,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: token.colorTextSecondary,
            }}
          >
            <div style={{ flex: '1 1 300px' }}>Đơn vị & Cơ cấu thứ bậc</div>
            <div style={{ width: 140, textAlign: 'center' }}>Phân loại</div>
            <div style={{ width: 160, textAlign: 'right' }}>Số dư an toàn</div>
            <div style={{ width: 220, textAlign: 'right' }}>Thao tác</div>
          </div>

          {/* Unit Rows */}
          <div className="unit-ledger-list">
            {units.map((unit) => {
              const depth = unit.depth || 0;
              const safeBalance = Number(unit.safeBalance) || 0;
              const isLeaf = unit.isLeaf ?? (!unit.children || unit.children.length === 0);
              const memberCount = unit.members?.length || 0;

              return (
                <div
                  key={unit.id}
                  className="unit-ledger-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    backgroundColor: depth === 0 ? token.colorFillAlter : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {/* Left: Hierarchy & Identity */}
                  <div
                    style={{
                      flex: '1 1 300px',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: depth * 24,
                      position: 'relative',
                    }}
                  >
                    {depth > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: depth * 24 - 14,
                          top: -12,
                          bottom: 12,
                          width: 12,
                          borderLeft: `1.5px solid ${token.colorBorder}`,
                          borderBottom: `1.5px solid ${token.colorBorder}`,
                          borderBottomLeftRadius: 4,
                        }}
                      />
                    )}

                    <Space size="middle" align="center">
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background:
                            depth === 0
                              ? token.colorFillAlter
                              : isLeaf
                              ? 'rgba(5, 150, 105, 0.08)'
                              : token.colorFillSecondary,
                          border: `1px solid ${
                            depth === 0
                              ? token.colorBorder
                              : isLeaf
                              ? 'rgba(5, 150, 105, 0.25)'
                              : token.colorBorderSecondary
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color:
                            depth === 0
                              ? token.colorPrimary
                              : isLeaf
                              ? token.colorSuccess
                              : token.colorTextSecondary,
                          fontSize: 15,
                          flexShrink: 0,
                        }}
                      >
                        {depth === 0 ? (
                          <BankOutlined />
                        ) : isLeaf ? (
                          <ApartmentOutlined />
                        ) : (
                          <FolderOpenOutlined />
                        )}
                      </div>

                      <Flex vertical gap={2}>
                        <Flex align="center" gap={6}>
                          <Text
                            strong
                            style={{
                              fontSize: 14,
                              color: depth === 0 ? token.colorPrimary : token.colorText,
                            }}
                          >
                            {unit.name}
                          </Text>
                          {depth === 0 && (
                            <Tag
                              color="blue"
                              bordered={false}
                              style={{
                                fontSize: 10,
                                lineHeight: '18px',
                                padding: '0 6px',
                                fontWeight: 600,
                              }}
                            >
                              ROOT
                            </Tag>
                          )}
                        </Flex>
                        <Space size="small" style={{ fontSize: 12, color: token.colorTextSecondary }}>
                          <span>
                            <TeamOutlined style={{ marginRight: 4 }} />
                            {memberCount} nhân sự
                          </span>
                        </Space>
                      </Flex>
                    </Space>
                  </div>

                  {/* Classification Pill */}
                  <div style={{ width: 140, textAlign: 'center' }}>
                    {isLeaf ? (
                      <Tag
                        color="success"
                        bordered={false}
                        style={{
                          borderRadius: 12,
                          padding: '1px 10px',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        Đơn vị chi (Lá)
                      </Tag>
                    ) : (
                      <Tag
                        color="purple"
                        bordered={false}
                        style={{
                          borderRadius: 12,
                          padding: '1px 10px',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        Đơn vị cha (Két vốn)
                      </Tag>
                    )}
                  </div>

                  {/* Safe Balance in Tabular Figures */}
                  <div style={{ width: 160, textAlign: 'right' }}>
                    <Flex vertical align="flex-end" gap={1}>
                      <Space size={6} align="center">
                        <span
                          style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: safeBalance > 0 ? token.colorSuccess : token.colorBorder,
                          }}
                        />
                        <Text
                          strong
                          className="tabular-nums"
                          style={{
                            fontSize: 14,
                            color: safeBalance > 0 ? token.colorSuccess : token.colorTextSecondary,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {formatVND(safeBalance)}
                        </Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                        Khả dụng
                      </Text>
                    </Flex>
                  </div>

                  {/* Actions Toolbar */}
                  <div style={{ width: 220, textAlign: 'right' }}>
                    <Space size={4} wrap>
                      <Tooltip title="Cấp ngân sách xuống">
                        <Button
                          size="small"
                          type="primary"
                          icon={<DollarOutlined />}
                          onClick={() => onOpenAllocateModal(unit)}
                          style={{ fontSize: 12 }}
                        >
                          Cấp vốn
                        </Button>
                      </Tooltip>

                      <Tooltip title="Thêm đơn vị trực thuộc">
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => onOpenCreateModal(unit)}
                        />
                      </Tooltip>

                      <Tooltip title="Gán thêm nhân viên">
                        <Button
                          size="small"
                          icon={<UserAddOutlined />}
                          onClick={() => onOpenAddMemberModal(unit)}
                        />
                      </Tooltip>

                      {unit.parentId !== null && (
                        <Tooltip title="Thu hồi ngân sách về cấp trên">
                          <Button
                            size="small"
                            danger
                            icon={<RollbackOutlined />}
                            onClick={() => onOpenRecallModal(unit)}
                          />
                        </Tooltip>
                      )}

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
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <style jsx global>{`
        .unit-ledger-row:hover {
          background-color: rgba(148, 163, 184, 0.08) !important;
        }
        @media (max-width: 768px) {
          .unit-ledger-header {
            display: none !important;
          }
          .unit-ledger-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 14px 16px !important;
          }
          .unit-ledger-row > div {
            width: 100% !important;
            text-align: left !important;
          }
          .unit-ledger-row > div:nth-child(4) {
            text-align: left !important;
          }
        }
      `}</style>
    </Flex>
  );
};
