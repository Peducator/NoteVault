'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Alert, Typography, Flex } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { formatVND } from '../../../lib/format';
import { AllocationRequestItem, allocationRequestApi } from '../../../apis/allocationRequestApi';

const { Text } = Typography;

interface FundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  request: AllocationRequestItem | null;
}

export const FundRequestModal: React.FC<FundRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  request,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestAmount = Number(request?.amount) || 0;

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setErrorMessage(null);
    }
  }, [isOpen, form]);

  const handleSubmit = async (values: any) => {
    if (!request) return;
    setErrorMessage(null);

    if (values.confirmation?.trim() !== 'CONFIRM') {
      setErrorMessage('Vui lòng gõ chính xác chữ CONFIRM để xác nhận phê duyệt giải ngân an toàn');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await allocationRequestApi.approveAndFundRequest(request.id, {
        confirmation: 'CONFIRM',
        note: values.note?.trim() || undefined,
      });

      if (res.success) {
        onSuccess(res.message || `Đã giải ngân thành công ${formatVND(requestAmount)} cho ${request.destinationUnit?.name}`);
        onClose();
      } else {
        setErrorMessage(res.message || 'Lỗi khi giải ngân yêu cầu');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống khi phê duyệt giải ngân');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <CheckCircleOutlined style={{ color: '#16a34a' }} />
          <span>Phê duyệt & Giải ngân ngân sách</span>
        </Flex>
      }
      open={isOpen && !!request}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      okText="Xác nhận giải ngân"
      cancelText="Hủy"
      okButtonProps={{ type: 'primary', style: { backgroundColor: '#16a34a' } }}
      destroyOnClose
    >
      <div style={{ padding: '12px 0' }}>
        {request && (
          <Alert
            message={
              <div>
                Đơn vị nhận: <strong>{request.destinationUnit?.name}</strong> • Số tiền yêu cầu:{' '}
                <strong style={{ color: '#16a34a' }}>{formatVND(requestAmount)}</strong>
                <br />
                Lý do xin cấp: <em>&quot;{request.reason}&quot;</em>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {errorMessage && (
          <Alert message={errorMessage} type="error" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={<Text strong>Xác nhận bảo mật (Gõ &quot;CONFIRM&quot; để thực thi)</Text>}
            name="confirmation"
            rules={[{ required: true, message: 'Vui lòng gõ CONFIRM' }]}
          >
            <Input placeholder="Gõ CONFIRM" />
          </Form.Item>

          <Form.Item label={<Text strong>Ghi chú phê duyệt (không bắt buộc)</Text>} name="note">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm nếu có..." />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
