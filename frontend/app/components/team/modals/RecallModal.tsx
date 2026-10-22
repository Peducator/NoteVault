'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Input, Alert, Typography, Flex } from 'antd';
import { RollbackOutlined } from '@ant-design/icons';
import { Unit } from '../../../types/expense';
import { allocationApi } from '../../../apis/allocationApi';
import { formatVND } from '../../../lib/format';

const { Text } = Typography;

interface RecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  sourceUnit: Unit | null;
  targetParentUnit?: Unit | null;
}

export const RecallModal: React.FC<RecallModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceUnit,
  targetParentUnit,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeBalance = sourceUnit ? Number(sourceUnit.safeBalance) || 0 : 0;
  const targetParentId = targetParentUnit?.id || sourceUnit?.parentId;

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setErrorMessage(null);
    }
  }, [isOpen, form]);

  const handleSubmit = async (values: any) => {
    if (!sourceUnit) return;
    setErrorMessage(null);

    const amountNum = Number(values.amount);
    if (amountNum > safeBalance) {
      setErrorMessage(
        `Số tiền thu hồi (${formatVND(amountNum)}) vượt quá số dư an toàn của đơn vị (${formatVND(safeBalance)}).`
      );
      return;
    }

    if (!targetParentId) {
      setErrorMessage('Đơn vị này không có đơn vị cha cấp trên để thu hồi tiền về.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await allocationApi.recallAllocation({
        sourceUnitId: sourceUnit.id,
        targetUnitId: targetParentId,
        amount: amountNum,
        reason: values.reason?.trim() || 'Thu hồi điều chỉnh ngân sách phòng ban',
      });

      if (res.success) {
        onSuccess(res.message || `Đã thu hồi thành công ${formatVND(amountNum)} từ ${sourceUnit.name}`);
        onClose();
      } else {
        setErrorMessage(res.message || 'Không thể thu hồi ngân sách');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống khi thu hồi ngân sách');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <RollbackOutlined style={{ color: '#d97706' }} />
          <span>Thu hồi ngân sách về đơn vị cha</span>
        </Flex>
      }
      open={isOpen && !!sourceUnit}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText="Xác nhận thu hồi"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
      destroyOnHidden
    >
      <div style={{ padding: '12px 0' }}>
        {sourceUnit && (
          <Alert
            title={
              <div>
                Thu hồi từ: <strong>{sourceUnit.name}</strong> • Số dư an toàn tối đa được thu hồi:{' '}
                <strong style={{ color: '#d97706' }}>{formatVND(safeBalance)}</strong>
                <br />
                Đơn vị cấp trên tiếp nhận: <strong>{targetParentUnit?.name || 'Đơn vị quản lý cấp trên'}</strong>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {errorMessage && (
          <Alert title={errorMessage} type="error" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={<Text strong>Số tiền thu hồi (VND)</Text>}
            name="amount"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền thu hồi' },
              {
                validator: async (_, val) => {
                  if (val !== undefined && Number(val) <= 0) {
                    throw new Error('Số tiền thu hồi phải lớn hơn 0');
                  }
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="Ví dụ: 5,000,000"
              suffix="VND"
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>Lý do thu hồi (Lưu vết kiểm toán)</Text>}
            name="reason"
            rules={[{ required: true, message: 'Vui lòng nhập lý do thu hồi' }]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: Điều chuyển ngân sách dự án sang phòng ban khác..." />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
