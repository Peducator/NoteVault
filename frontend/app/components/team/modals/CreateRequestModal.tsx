'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, Alert, Typography, Flex } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { Unit } from '../../../types/expense';
import { allocationRequestApi } from '../../../apis/allocationRequestApi';

const { Text } = Typography;

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  units: Unit[];
  defaultUnitId?: number;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  units,
  defaultUnitId,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validUnits = units.filter((u) => u.parentId !== null);

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setErrorMessage(null);
      if (defaultUnitId || validUnits[0]?.id) {
        form.setFieldsValue({
          destinationUnitId: defaultUnitId || validUnits[0]?.id,
        });
      }
    }
  }, [isOpen, defaultUnitId, validUnits, form]);

  const handleSubmit = async (values: any) => {
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const res = await allocationRequestApi.createRequest({
        destinationUnitId: values.destinationUnitId,
        amount: Number(values.amount),
        reason: values.reason.trim(),
      });

      if (res.success) {
        onSuccess(res.message || 'Gửi yêu cầu xin cấp ngân sách thành công');
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể tạo yêu cầu');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <SendOutlined style={{ color: '#2563eb' }} />
          <span>Lập yêu cầu xin cấp ngân sách (Request)</span>
        </Flex>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText="Gửi yêu cầu"
      cancelText="Hủy"
      destroyOnClose
    >
      <div style={{ padding: '12px 0' }}>
        <Alert
          message="Yêu cầu sẽ được chuyển đến người quản lý của đơn vị cấp trên trực tiếp để phê duyệt."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {errorMessage && (
          <Alert message={errorMessage} type="error" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={<Text strong>Đơn vị cần xin ngân sách</Text>}
            name="destinationUnitId"
            rules={[{ required: true, message: 'Vui lòng chọn đơn vị nhận tiền' }]}
          >
            <Select
              placeholder="Chọn phòng ban cần bổ sung quỹ"
              options={validUnits.map((u) => ({
                value: u.id,
                label: u.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>Số tiền đề xuất xin cấp (VND)</Text>}
            name="amount"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền' },
              {
                validator: async (_, val) => {
                  if (val !== undefined && Number(val) <= 0) {
                    throw new Error('Số tiền phải lớn hơn 0');
                  }
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="Ví dụ: 15,000,000"
              addonAfter="VND"
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>Lý do đề xuất / Kế hoạch sử dụng</Text>}
            name="reason"
            rules={[{ required: true, message: 'Vui lòng nêu rõ lý do xin ngân sách' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Ví dụ: Bổ sung kinh phí tổ chức sự kiện khai trương chi nhánh..."
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
