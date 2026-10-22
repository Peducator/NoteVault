'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, Alert, Typography, Flex } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { Unit } from '../../../types/expense';
import { allocationApi } from '../../../apis/allocationApi';
import { formatVND } from '../../../lib/format';

const { Text } = Typography;

interface AllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  sourceUnit: Unit | null;
  targetUnits: Unit[];
}

export const AllocateModal: React.FC<AllocateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceUnit,
  targetUnits,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeBalance = sourceUnit ? Number(sourceUnit.safeBalance) || 0 : Infinity;
  const availableTargetUnits = targetUnits.filter((u) => !sourceUnit || u.id !== sourceUnit.id);

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setErrorMessage(null);
    }
  }, [isOpen, form]);

  const handleSubmit = async (values: any) => {
    setErrorMessage(null);
    const amountNum = Number(values.amount);

    if (sourceUnit && amountNum > safeBalance) {
      setErrorMessage(`Số tiền cấp (${formatVND(amountNum)}) vượt quá số dư an toàn của đơn vị nguồn (${formatVND(safeBalance)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await allocationApi.createAllocation({
        sourceUnitId: sourceUnit ? sourceUnit.id : null,
        targetUnitId: values.targetUnitId,
        amount: amountNum,
        note: values.note,
      });

      if (res.success) {
        onSuccess(res.message || 'Cấp ngân sách thành công');
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể cấp ngân sách');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi cấp ngân sách');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <DollarOutlined style={{ color: '#2563eb' }} />
          <span>Cấp phát ngân sách trực tiếp</span>
        </Flex>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText="Xác nhận cấp tiền"
      cancelText="Hủy"
      destroyOnHidden
    >
      <div style={{ padding: '12px 0' }}>
        {sourceUnit ? (
          <Alert
            title={
              <div>
                Đơn vị nguồn: <strong>{sourceUnit.name}</strong> • Số dư an toàn:{' '}
                <strong style={{ color: '#16a34a' }}>{formatVND(safeBalance)}</strong>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            title="Cấp ngân sách từ Quỹ chủ sở hữu gốc (ROOT / Công ty mẹ)"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {errorMessage && (
          <Alert title={errorMessage} type="error" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={<Text strong>Đơn vị thụ hưởng (Nhận tiền)</Text>}
            name="targetUnitId"
            rules={[{ required: true, message: 'Vui lòng chọn đơn vị nhận tiền' }]}
          >
            <Select
              placeholder="Chọn đơn vị nhận ngân sách"
              options={availableTargetUnits.map((u) => ({
                value: u.id,
                label: `${u.name} (Số dư hiện tại: ${formatVND(Number(u.safeBalance) || 0)})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>Số tiền cấp phát (VND)</Text>}
            name="amount"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền' },
              {
                validator: async (_, val) => {
                  if (val !== undefined && Number(val) <= 0) {
                    throw new Error('Số tiền cấp phải lớn hơn 0');
                  }
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="Ví dụ: 10,000,000"
              suffix="VND"
            />
          </Form.Item>

          <Form.Item label={<Text strong>Ghi chú / Quyết định phân bổ</Text>} name="note">
            <Input.TextArea rows={3} placeholder="Ví dụ: Cấp ngân sách vận hành tháng 10/2026..." />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
