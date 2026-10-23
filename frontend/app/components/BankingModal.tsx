'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  Tag,
  Popconfirm,
  App,
  Typography,
  Card,
  Flex,
  Space,
  Empty,
  Badge,
  theme,
} from 'antd';
import {
  BankOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { bankingApi, BankingAccount } from '../apis/bankingApi';

const { Text, Title } = Typography;

interface BankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const POPULAR_BANKS = [
  { code: 'VCB', name: 'Vietcombank (Ngoại Thương Việt Nam)' },
  { code: 'TCB', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  { code: 'MB', name: 'MB Bank (Quân Đội)' },
  { code: 'CTG', name: 'VietinBank (Công Thương Việt Nam)' },
  { code: 'BIDV', name: 'BIDV (Đầu tư và Phát triển Việt Nam)' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)' },
  { code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'HDB', name: 'HDBank (Phát triển TP.HCM)' },
  { code: 'OTHER', name: 'Ngân hàng khác' },
];

export const BankingModal: React.FC<BankingModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [accounts, setAccounts] = useState<BankingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await bankingApi.getAccounts();
      if (res.success && Array.isArray(res.data)) {
        setAccounts(res.data);
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể tải thông tin ngân hàng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setIsCreating(false);
      form.resetFields();
    }
  }, [isOpen]);

  const handleBankSelect = (bankCode: string) => {
    const selected = POPULAR_BANKS.find((b) => b.code === bankCode);
    if (selected && bankCode !== 'OTHER') {
      form.setFieldsValue({ bankName: selected.name, bankCode: selected.code });
    }
  };

  const handleFinishCreate = async (values: any) => {
    try {
      setIsSubmitting(true);
      let bankName = values.bankName;
      let bankCode = values.bankCode;

      if (values.selectedBankCode && values.selectedBankCode !== 'OTHER') {
        const found = POPULAR_BANKS.find((b) => b.code === values.selectedBankCode);
        if (found) {
          bankName = found.name;
          bankCode = found.code;
        }
      }

      await bankingApi.createAccount({
        bankName,
        bankCode,
        accountNumber: values.accountNumber.trim(),
        accountHolder: values.accountHolder.trim().toUpperCase(),
        branch: values.branch ? values.branch.trim() : undefined,
        isDefault: accounts.length === 0 ? true : !!values.isDefault,
      });

      message.success('Đã thêm tài khoản ngân hàng thành công');
      setIsCreating(false);
      form.resetFields();
      await fetchAccounts();
      onUpdated?.();
    } catch (err: any) {
      message.error(err.message || 'Không thể thêm tài khoản');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await bankingApi.deleteAccount(id);
      message.success('Đã xóa tài khoản ngân hàng');
      await fetchAccounts();
      onUpdated?.();
    } catch (err: any) {
      message.error(err.message || 'Không thể xóa tài khoản');
    }
  };

  const handleSetDefault = async (account: BankingAccount) => {
    try {
      await bankingApi.updateAccount(account.id, { isDefault: true });
      message.success(`Đã đặt tài khoản ${account.bankCode || account.bankName} làm mặc định`);
      await fetchAccounts();
      onUpdated?.();
    } catch (err: any) {
      message.error(err.message || 'Không thể cập nhật mặc định');
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <BankOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
          <span>Tài Khoản Ngân Hàng Hoàn Ứng Cá Nhân</span>
        </Flex>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={640}
      destroyOnHidden
    >
      <Flex vertical gap="middle" style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Thông tin số tài khoản của bạn được mã hóa an toàn theo tiêu chuẩn ngân hàng. Khi quản lý duyệt chi hoặc kế toán bấm &ldquo;Hoàn ứng&rdquo;, hệ thống sẽ dùng số tài khoản mặc định này để giải ngân.
        </Text>

        {!isCreating && (
          <Flex justify="space-between" align="center">
            <Text strong style={{ fontSize: 14 }}>
              Danh sách tài khoản ({accounts.length})
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setIsCreating(true);
              }}
            >
              Thêm tài khoản mới
            </Button>
          </Flex>
        )}

        {isCreating && (
          <Card
            size="small"
            title={
              <Flex align="center" gap="small">
                <CreditCardOutlined style={{ color: '#1677ff' }} />
                <span>Liên kết số tài khoản ngân hàng mới</span>
              </Flex>
            }
            style={{ borderColor: '#1677ff', background: '#f8fafc' }}
          >
            <Form form={form} layout="vertical" onFinish={handleFinishCreate}>
              <Form.Item
                label="Chọn ngân hàng"
                name="selectedBankCode"
                rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}
              >
                <Select
                  placeholder="Chọn từ danh sách ngân hàng tại Việt Nam"
                  onChange={handleBankSelect}
                  options={POPULAR_BANKS.map((b) => ({
                    value: b.code,
                    label: `${b.code} - ${b.name}`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.selectedBankCode !== curr.selectedBankCode}
              >
                {({ getFieldValue }) =>
                  getFieldValue('selectedBankCode') === 'OTHER' ? (
                    <Form.Item
                      label="Tên ngân hàng cụ thể"
                      name="bankName"
                      rules={[{ required: true, message: 'Vui lòng nhập tên ngân hàng' }]}
                    >
                      <Input placeholder="Ví dụ: Ngân hàng số Timo, Shinhan Bank..." />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>

              <Flex gap="middle">
                <Form.Item
                  label="Số tài khoản ngân hàng"
                  name="accountNumber"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số tài khoản' },
                    { pattern: /^[0-9A-Za-z]+$/, message: 'Số tài khoản chỉ chứa số và chữ' },
                  ]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="Ví dụ: 19033888999011" />
                </Form.Item>

                <Form.Item
                  label="Tên chủ tài khoản (Viết hoa không dấu)"
                  name="accountHolder"
                  rules={[{ required: true, message: 'Vui lòng nhập tên chủ tài khoản' }]}
                  style={{ flex: 1 }}
                >
                  <Input
                    placeholder="NGUYEN VAN A"
                    style={{ textTransform: 'uppercase' }}
                    onChange={(e) => {
                      form.setFieldsValue({ accountHolder: e.target.value.toUpperCase() });
                    }}
                  />
                </Form.Item>
              </Flex>

              <Form.Item label="Chi nhánh (không bắt buộc)" name="branch">
                <Input placeholder="Ví dụ: Chi nhánh Hội sở, Sở giao dịch 1..." />
              </Form.Item>

              <Flex justify="flex-end" gap="small" style={{ marginTop: 8 }}>
                <Button onClick={() => setIsCreating(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={isSubmitting}>
                  Lưu tài khoản
                </Button>
              </Flex>
            </Form>
          </Card>
        )}

        {/* Danh sách thẻ ngân hàng hiện có */}
        <Flex vertical gap="small">
          {accounts.length === 0 && !isCreating ? (
            <Card style={{ textAlign: 'center', background: '#fafafa' }}>
              <Empty
                description="Bạn chưa lưu tài khoản ngân hàng nào để nhận tiền hoàn ứng."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreating(true)}
                >
                  Thêm tài khoản ngay
                </Button>
              </Empty>
            </Card>
          ) : (
            accounts.map((acc) => (
              <Card
                key={acc.id}
                size="small"
                style={{
                  border: acc.isDefault ? '1.5px solid #1677ff' : '1px solid #e2e8f0',
                  background: acc.isDefault ? '#f0f7ff' : '#ffffff',
                }}
              >
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap="middle">
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: acc.isDefault ? '#1677ff' : '#64748b',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                      }}
                    >
                      <BankOutlined />
                    </div>

                    <Flex vertical gap={2}>
                      <Flex align="center" gap="small">
                        <Text strong style={{ fontSize: 14 }}>
                          {acc.bankName}
                        </Text>
                        {acc.bankCode && (
                          <Tag color="blue" style={{ fontSize: 11 }}>
                            {acc.bankCode}
                          </Tag>
                        )}
                        {acc.isDefault && (
                          <Tag color="success" icon={<CheckCircleOutlined />}>
                            Mặc định
                          </Tag>
                        )}
                      </Flex>
                      <Text
                        strong
                        style={{
                          fontSize: 15,
                          letterSpacing: '1px',
                          fontFamily: 'monospace',
                          color: '#0f172a',
                        }}
                      >
                        {acc.accountNumber}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Chủ TK: <span style={{ fontWeight: 600 }}>{acc.accountHolder}</span>
                        {acc.branch && ` • Chi nhánh: ${acc.branch}`}
                      </Text>
                    </Flex>
                  </Flex>

                  <Space size="small">
                    {!acc.isDefault && (
                      <Button
                        size="small"
                        onClick={() => handleSetDefault(acc)}
                      >
                        Đặt mặc định
                      </Button>
                    )}
                    <Popconfirm
                      title="Xóa tài khoản"
                      description="Bạn có chắc muốn xóa tài khoản ngân hàng này?"
                      onConfirm={() => handleDelete(acc.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Space>
                </Flex>
              </Card>
            ))
          )}
        </Flex>
      </Flex>
    </Modal>
  );
};
