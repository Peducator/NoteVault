'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Typography, Flex, Card, Row, Col, Space } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { authApi } from '../apis/authApi';
import { ThemeToggle } from './ThemeToggle';

const { Title, Text, Paragraph } = Typography;

interface LoginFormProps {
  onBackToLanding: () => void;
  onGoToRegister: () => void;
  onSubmitSuccess?: (user?: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onBackToLanding,
  onGoToRegister,
  onSubmitSuccess,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('nv_registered_email');
      if (savedEmail) {
        form.setFieldsValue({ email: savedEmail });
      }
    }
  }, [form]);

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await authApi.login({
        email: values.email.trim(),
        password: values.password,
      });

      if (typeof window !== 'undefined' && result.data) {
        localStorage.setItem('nv_access_token', result.data.accessToken || '');
        localStorage.setItem('nv_refresh_token', result.data.refreshToken || '');
        if (result.data.user) {
          localStorage.setItem('nv_user', JSON.stringify(result.data.user));
        }
      }

      if (onSubmitSuccess) onSubmitSuccess(result.data?.user);
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
        setErrorMessage('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng đảm bảo server backend đang chạy.');
      } else {
        setErrorMessage(err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <Row style={{ width: '100%', minHeight: '100vh' }}>
        {/* Cột trái: Form đăng nhập */}
        <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={onBackToLanding}
                style={{ paddingLeft: 0 }}
              >
                Trang chủ
              </Button>
              <ThemeToggle />
            </Flex>

            <Flex align="center" gap="small" style={{ marginBottom: 16 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 20,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
              <Title level={3} style={{ margin: 0 }}>
                NoteVault
              </Title>
            </Flex>

            <Title level={2} style={{ marginBottom: 8, marginTop: 8 }}>
              Đăng nhập hệ thống
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 28 }}>
              Truy cập không gian làm việc để quản trị ngân sách và duyệt chứng từ tài chính.
            </Paragraph>

            {errorMessage && (
              <Alert
                title={errorMessage}
                type="error"
                showIcon
                closable
                onClose={() => setErrorMessage(null)}
                style={{ marginBottom: 20 }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                label={<Text strong>Email công việc</Text>}
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email công việc' },
                  { type: 'email', message: 'Địa chỉ email không hợp lệ' },
                ]}
              >
                <Input
                  id="email"
                  type="email"
                  prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                  placeholder="admin@abc.test hoặc email của bạn"
                />
              </Form.Item>

              <Form.Item
                label={
                  <Flex justify="space-between" style={{ width: '100%' }}>
                    <Text strong>Mật khẩu</Text>
                  </Flex>
                }
                name="password"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
              >
                <Input.Password
                  id="password"
                  prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                  placeholder="Mật khẩu của bạn"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isLoading}
                  style={{ height: 44, fontWeight: 600 }}
                >
                  Đăng nhập vào không gian làm việc
                </Button>
              </Form.Item>
            </Form>

            <Paragraph style={{ textAlign: 'center', marginTop: 20 }}>
              Doanh nghiệp chưa tham gia?{' '}
              <Button type="link" onClick={onGoToRegister} style={{ padding: 0, fontWeight: 600 }}>
                Đăng ký doanh nghiệp mới
              </Button>
            </Paragraph>
          </div>
        </Col>

        {/* Cột phải: Enterprise Branding Banner */}
        <Col
          xs={0}
          lg={12}
          style={{
            background: 'linear-gradient(135deg, #0b1329 0%, #1e3a8a 100%)',
            color: '#fff',
            padding: 64,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 600 }}>
            <div>
              <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: 12,
                color: '#38bdf8',
                marginBottom: 36,
              }}
            >
              <SafetyCertificateOutlined />
              Kiến trúc Zero Trust B2B FinTech
            </div>

            <Title level={2} style={{ color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
              Quản trị minh bạch & Kiểm soát thời gian thực mọi dòng tiền doanh nghiệp.
            </Title>
            <Paragraph style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
              NoteVault số hóa toàn diện quy trình cấp phát ngân sách phân tầng, bóc tách hóa đơn tự động bằng AI và đối soát an toàn tuyệt đối.
            </Paragraph>

            <Card
              variant="borderless"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <Flex vertical gap="middle" style={{ width: '100%' }}>
                <Flex justify="space-between" align="center">
                  <Text style={{ color: '#94a3b8' }}>Thời gian duyệt ngân sách</Text>
                  <Text strong style={{ color: '#4ade80' }}>
                    <CheckCircleOutlined /> Giảm 75% so với thủ công
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text style={{ color: '#94a3b8' }}>Tỉ lệ bảo đảm số dư an toàn</Text>
                  <Text strong style={{ color: '#4ade80' }}>
                    <CheckCircleOutlined /> 100% không bao giờ âm quỹ
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text style={{ color: '#94a3b8' }}>Bóc tách OCR AI Hóa đơn</Text>
                  <Text strong style={{ color: '#38bdf8' }}>
                    Chính xác 99.8%
                  </Text>
                </Flex>
              </Flex>
            </Card>
          </div>

          <Text style={{ color: '#64748b', fontSize: 12 }}>
            © 2026 NoteVault Technologies Inc. Bảo lưu mọi quyền.
          </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
};
