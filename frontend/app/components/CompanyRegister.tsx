'use client';

import React, { useState } from 'react';
import { Form, Input, Select, Button, Alert, Typography, Flex, Card, Row, Col, Space } from 'antd';
import {
  BankOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { authApi } from '../apis/authApi';
import { ThemeToggle } from './ThemeToggle';

const { Title, Text, Paragraph } = Typography;

interface CompanyRegisterProps {
  onBackToLanding: () => void;
  onGoToLogin: () => void;
  onSubmitSuccess?: () => void;
}

export const CompanyRegister: React.FC<CompanyRegisterProps> = ({
  onBackToLanding,
  onGoToLogin,
  onSubmitSuccess,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    form.setFieldsValue({ slug: generatedSlug });
  };

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authApi.signup({
        companyName: values.companyName.trim(),
        name: values.adminName.trim(),
        email: values.adminEmail.trim(),
        password: values.password,
      });

      setSuccessMessage('Khởi tạo tài khoản doanh nghiệp thành công! Đang chuyển hướng sang đăng nhập...');

      if (typeof window !== 'undefined') {
        localStorage.setItem('nv_registered_email', values.adminEmail.trim());
        localStorage.setItem('nv_registered_company', values.companyName.trim());
      }

      setTimeout(() => {
        if (onSubmitSuccess) onSubmitSuccess();
      }, 1500);
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
        setErrorMessage('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng đảm bảo server backend đang chạy.');
      } else {
        setErrorMessage(err.message || 'Đã có lỗi xảy ra trong quá trình đăng ký');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <Row style={{ width: '100%', minHeight: '100vh' }}>
        {/* Cột trái: Form đăng ký */}
        <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
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

            <Flex align="center" gap="small" style={{ marginBottom: 12 }}>
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

            <Title level={2} style={{ marginBottom: 6, marginTop: 4 }}>
              Đăng ký doanh nghiệp
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
              Khởi tạo không gian làm việc độc lập và kiến trúc đa phân tầng cho tổ chức.
            </Paragraph>

            {errorMessage && (
              <Alert
                title={errorMessage}
                type="error"
                showIcon
                closable
                onClose={() => setErrorMessage(null)}
                style={{ marginBottom: 16 }}
              />
            )}

            {successMessage && (
              <Alert
                title={successMessage}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ teamSize: '10 - 50 người' }}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                label={<Text strong>Tên công ty / Tập đoàn</Text>}
                name="companyName"
                rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}
              >
                <Input
                  prefix={<BankOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                  placeholder="Ví dụ: Công ty Công nghệ ABC"
                  onChange={handleCompanyNameChange}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong>Mã định danh (Slug)</Text>}
                    name="slug"
                    rules={[{ required: true, message: 'Vui lòng nhập mã định danh' }]}
                  >
                    <Input prefix="@" placeholder="abc-corp" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong>Quy mô nhân sự</Text>}
                    name="teamSize"
                  >
                    <Select
                      options={[
                        { value: '10 - 50 người', label: '10 - 50 người' },
                        { value: '50 - 200 người', label: '50 - 200 người' },
                        { value: '200+ người', label: '200+ người' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong>Họ tên quản trị viên</Text>}
                    name="adminName"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên quản trị viên' }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                      placeholder="Nguyễn Văn A"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong>Email quản trị</Text>}
                    name="adminEmail"
                    rules={[
                      { required: true, message: 'Vui lòng nhập email quản trị' },
                      { type: 'email', message: 'Email không hợp lệ' },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                      placeholder="admin@congty.com"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={<Text strong>Mật khẩu khởi tạo</Text>}
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                  placeholder="Tối thiểu 6 ký tự"
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
                  Tạo tài khoản doanh nghiệp
                </Button>
              </Form.Item>
            </Form>

            <Paragraph style={{ textAlign: 'center', marginTop: 16 }}>
              Đã có tài khoản?{' '}
              <Button type="link" onClick={onGoToLogin} style={{ padding: 0, fontWeight: 600 }}>
                Đăng nhập ngay
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
              Bảo mật cấp Doanh nghiệp Multi-Tenant
            </div>

            <Title level={2} style={{ color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
              Cách ly hoàn toàn dữ liệu tài chính & cây ngân sách giữa các công ty.
            </Title>
            <Paragraph style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
              Mỗi tổ chức sở hữu một không gian độc lập, phân quyền chặt chẽ từ nhân viên nộp hóa đơn, trưởng phòng duyệt chi đến ban giám đốc cấp hạn mức.
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
                  <Text style={{ color: '#94a3b8' }}>Không gian lưu trữ hóa đơn S3</Text>
                  <Text strong style={{ color: '#4ade80' }}>
                    <CheckCircleOutlined /> Cách ly tenant 100%
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text style={{ color: '#94a3b8' }}>Ngăn ngừa chi vượt ngân sách</Text>
                  <Text strong style={{ color: '#4ade80' }}>
                    <CheckCircleOutlined /> Khóa phân tầng tự động
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text style={{ color: '#94a3b8' }}>Nhật ký kiểm toán (Audit Trail)</Text>
                  <Text strong style={{ color: '#38bdf8' }}>
                    Lưu trữ minh bạch trọn đời
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
