'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Alert, Typography, Flex } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { Unit, EmployeeUser } from '../../../types/expense';
import { unitApi } from '../../../apis/unitApi';

const { Text } = Typography;

interface CreateUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  parentUnit: Unit | null;
  employees: EmployeeUser[];
}

export const CreateUnitModal: React.FC<CreateUnitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  parentUnit,
  employees,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setErrorMessage(null);
    }
  }, [isOpen, form]);

  const handleSubmit = async (values: any) => {
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const res = await unitApi.createUnit({
        name: values.name.trim(),
        parentId: parentUnit ? parentUnit.id : null,
        ownerId: values.ownerId,
        allowCreateSubUnit: !!values.allowCreateSubUnit,
        allowMemberViewBalance: !!values.allowMemberViewBalance,
      });

      if (res.success) {
        onSuccess(res.message || `Đã tạo đơn vị "${values.name}" thành công`);
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể tạo đơn vị');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo đơn vị');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <ApartmentOutlined style={{ color: '#2563eb' }} />
          <span>{parentUnit ? `Thêm đơn vị con thuộc "${parentUnit.name}"` : 'Tạo đơn vị phòng ban gốc'}</span>
        </Flex>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText="Tạo đơn vị"
      cancelText="Hủy"
      destroyOnHidden
    >
      <div style={{ padding: '12px 0' }}>
        {parentUnit ? (
          <Alert
            title={<span>Đơn vị cấp trên (Parent): <strong>{parentUnit.name}</strong></span>}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            title="Đơn vị này sẽ được đặt ở cấp cao nhất trong cây tổ chức"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {errorMessage && (
          <Alert title={errorMessage} type="error" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ allowCreateSubUnit: false, allowMemberViewBalance: false }}
        >
          <Form.Item
            label={<Text strong>Tên đơn vị / Phòng ban mới</Text>}
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên đơn vị' }]}
          >
            <Input placeholder="Ví dụ: Phòng Marketing, Chi nhánh Đà Nẵng..." />
          </Form.Item>

          <Form.Item
            label={<Text strong>Trưởng đơn vị / Người quản lý (Owner)</Text>}
            name="ownerId"
            rules={[{ required: true, message: 'Vui lòng chọn người quản lý' }]}
          >
            <Select
              placeholder="Chọn nhân viên quản lý đơn vị"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.name} (${emp.email}) - ${emp.role}`,
              }))}
            />
          </Form.Item>

          <Flex vertical gap="middle" style={{ marginTop: 16 }}>
            <Flex justify="space-between" align="center">
              <div>
                <Text strong style={{ fontSize: 13 }}>Cho phép tạo đơn vị con</Text>
                <div style={{ fontSize: 11, color: 'gray' }}>Đơn vị này có thể phân nhánh thành các tổ/đội nhỏ hơn</div>
              </div>
              <Form.Item name="allowCreateSubUnit" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Flex>

            <Flex justify="space-between" align="center">
              <div>
                <Text strong style={{ fontSize: 13 }}>Thành viên được xem số dư</Text>
                <div style={{ fontSize: 11, color: 'gray' }}>Nhân viên trong đơn vị có thể xem số dư an toàn</div>
              </div>
              <Form.Item name="allowMemberViewBalance" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Flex>
          </Flex>
        </Form>
      </div>
    </Modal>
  );
};
