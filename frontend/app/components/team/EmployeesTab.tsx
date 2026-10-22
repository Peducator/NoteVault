'use client';

import React, { useState } from 'react';
import { Table, Card, Input, Select, Tag, Avatar, Space, Button, Popconfirm, Typography, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, UserOutlined, UserSwitchOutlined, DeleteOutlined } from '@ant-design/icons';
import { EmployeeUser, Unit } from '../../types/expense';

const { Text } = Typography;

interface EmployeesTabProps {
  employees: EmployeeUser[];
  units: Unit[];
  onOpenAddMemberModal: (unit: Unit) => void;
  onRemoveMember: (unitId: number, userId: number) => void;
  currentUserRole?: string;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  units,
  onOpenAddMemberModal,
  onRemoveMember,
  currentUserRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const unitMap = new Map(units.map((u) => [u.id, u]));
  const isRoot = currentUserRole === 'ROOT';

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUnit =
      unitFilter === 'ALL' ||
      (unitFilter === 'UNASSIGNED' ? !emp.unitId : emp.unitId?.toString() === unitFilter);

    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

    return matchesSearch && matchesUnit && matchesRole;
  });

  const columns: ColumnsType<EmployeeUser> = [
    {
      title: 'Nhân viên',
      key: 'name',
      render: (_, record) => (
        <Space size="middle">
          <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />}>
            {(record.name || record.email).charAt(0).toUpperCase()}
          </Avatar>
          <Flex vertical gap={2}>
            <Text strong>{record.name || 'Chưa cập nhật tên'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </Flex>
        </Space>
      ),
    },
    {
      title: 'Vai trò tài khoản',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        if (role === 'ROOT') return <Tag color="purple">ROOT ADMIN</Tag>;
        if (role === 'MANAGER') return <Tag color="blue">QUẢN LÝ</Tag>;
        return <Tag color="default">NHÂN VIÊN</Tag>;
      },
    },
    {
      title: 'Đơn vị trực thuộc',
      key: 'unit',
      render: (_, record) => {
        const u = record.unitId ? unitMap.get(record.unitId) : record.unit;
        if (!u) return <Text type="secondary">Chưa gán đơn vị</Text>;
        return (
          <Space>
            <Tag color="cyan">{u.name}</Tag>
            {record.unitMemberRole && (
              <Tag color={record.unitMemberRole === 'EDIT' ? 'orange' : 'green'}>
                {record.unitMemberRole}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const fullUnit = record.unitId
          ? unitMap.get(record.unitId)
          : (record.unit ? unitMap.get(record.unit.id) : undefined);

        return (
          <Space size="small">
            {units.length > 0 && (
              <Button
                size="small"
                icon={<UserSwitchOutlined />}
                onClick={() => {
                  const targetUnit = fullUnit || units[0];
                  if (targetUnit) onOpenAddMemberModal(targetUnit);
                }}
              >
                Gán đơn vị
              </Button>
            )}

            {isRoot && fullUnit && (
              <Popconfirm
                title="Gỡ nhân viên khỏi đơn vị này?"
                onConfirm={() => onRemoveMember(fullUnit.id, record.id)}
                okText="Gỡ"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger type="text" icon={<DeleteOutlined />}>
                  Gỡ
                </Button>
              </Popconfirm>
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
          <Text strong style={{ fontSize: 16 }}>Danh sách Nhân sự ({filteredEmployees.length})</Text>
          <Space wrap>
            <Input
              prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Tìm theo tên, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              value={unitFilter}
              onChange={(val) => setUnitFilter(val)}
              style={{ width: 170 }}
              options={[
                { value: 'ALL', label: 'Tất cả đơn vị' },
                { value: 'UNASSIGNED', label: 'Chưa vào đơn vị' },
                ...units.map((u) => ({ value: u.id.toString(), label: u.name })),
              ]}
            />
            <Select
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: 'Tất cả vai trò' },
                { value: 'ROOT', label: 'ROOT' },
                { value: 'MANAGER', label: 'MANAGER' },
                { value: 'MEMBER', label: 'MEMBER' },
              ]}
            />
          </Space>
        </Flex>
      }
    >
      <Table<EmployeeUser>
        columns={columns}
        dataSource={filteredEmployees}
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: true }}
        scroll={{ x: 600 }}
      />
    </Card>
  );
};
