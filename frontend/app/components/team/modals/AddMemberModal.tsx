'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Radio, Alert, Typography, Flex } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { Unit, EmployeeUser } from '../../../types/expense';
import { unitApi } from '../../../apis/unitApi';

const { Text } = Typography;

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  unit: Unit | null;
  employees: EmployeeUser[];
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  unit,
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
    if (!unit) return;
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const res = await unitApi.addMember(unit.id, values.userId, values.role);

      if (res.success) {
        onSuccess(res.message || `Đã thêm nhân viên vào đơn vị ${unit.name}`);
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể thêm nhân viên');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thêm nhân viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <UserAddOutlined style={{ color: '#2563eb' }} />
          <span>Gán nhân sự vào đơn vị: {unit?.name}</span>
        </Flex>
      }
      open={isOpen && !!unit}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText="Thêm nhân sự"
      cancelText="Hủy"
      destroyOnClose
    >
      <div style={{ padding: '12px 0' }}>
        {errorMessage && (
          <Alert message={errorMessage} type="error" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ role: 'VIEWER' }}
        >
          <Form.Item
            label={<Text strong>Chọn nhân viên</Text>}
            name="userId"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select
              placeholder="Tìm kiếm theo tên hoặc email"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.name} (${emp.email}) - Hiện tại: ${emp.unit?.name || 'Chưa vào đơn vị'}`,
              }))}
            />
          </Form.Item>

          <Form.Item label={<Text strong>Quyền hạn trong đơn vị</Text>} name="role">
            <Radio.Group style={{ width: '100%' }}>
              <Flex vertical gap="small">
                <Radio value="VIEWER">
                  <div>
                    <Text strong>Thành viên (VIEWER)</Text>
                    <div style={{ fontSize: 11, color: 'gray' }}>Chỉ nộp đề xuất và hóa đơn chi tiêu</div>
                  </div>
                </Radio>
                <Radio value="EDIT">
                  <div>
                    <Text strong>Đồng quản lý (EDIT)</Text>
                    <div style={{ fontSize: 11, color: 'gray' }}>Có quyền sơ duyệt yêu cầu và quản trị ngân sách con</div>
                  </div>
                </Radio>
              </Flex>
            </Radio.Group>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
