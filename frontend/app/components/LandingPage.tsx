'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  Row,
  Col,
  Typography,
  Collapse,
  Tag,
  Segmented,
  Space,
  Flex,
  Divider,
  theme,
} from 'antd';
import {
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  ScanOutlined,
  LockOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { ThemeToggle } from './ThemeToggle';
import { formatVND } from '../lib/format';

const { Title, Text, Paragraph } = Typography;

interface LandingPageProps {
  loginHref?: string;
  registerHref?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  loginHref = '/login',
  registerHref = '/register-company',
}) => {
  const { token } = theme.useToken();
  const [selectedDemoUnit, setSelectedDemoUnit] = useState<'root' | 'kd' | 'sales'>('sales');

  const demoData = {
    root: {
      name: 'ABC (Gốc)',
      roleBadge: 'Giám đốc Hoàng (ROOT)',
      level: 'Cấp 1 - Đơn vị Gốc',
      totalIn: 1000000000,
      totalOut: 700000000,
      safeBalance: 300000000,
      description: 'Nạp vốn ban đầu 1 tỷ đồng. Đã cấp 400tr cho Khối KD và 300tr cho Khối CN.',
      recentActivity: 'Cấp ngân sách 400.000.000 ₫ cho Khối Kinh doanh',
    },
    kd: {
      name: 'Khối Kinh doanh',
      roleBadge: 'Trưởng khối Khoa (ROOT cấp 1)',
      level: 'Cấp 2 - Đơn vị Cha',
      totalIn: 400000000,
      totalOut: 255000000,
      safeBalance: 145000000,
      description: 'Nhận 400tr từ Gốc. Đã cấp 150tr cho Sales, 100tr cho Marketing, 5tr cho Sự kiện.',
      recentActivity: 'Cấp ngân sách 150.000.000 ₫ cho Nhóm Sales',
    },
    sales: {
      name: 'Nhóm Sales (Lá)',
      roleBadge: 'An (Admin nhóm Sales)',
      level: 'Cấp 3 - Đơn vị Lá (Phát sinh chi tiêu)',
      totalIn: 150000000,
      totalOut: 26000000,
      safeBalance: 124000000,
      description: 'Nhận 150tr từ Khối KD. Đã duyệt chi 26tr. Còn 2 khoản chờ duyệt (8tr).',
      recentActivity: 'Dũng (Sales) chi 12.000.000 ₫ - Đã duyệt bởi An',
    },
  };

  const currentDemo = demoData[selectedDemoUnit];

  const faqs = [
    {
      key: '1',
      label: <Text strong>Quy tắc cấp tiền giữa các đơn vị hoạt động như thế nào?</Text>,
      children: (
        <Paragraph type="secondary">
          Tiền chảy theo cây phân cấp từ cha xuống con trực tiếp, tuyệt đối không được nhảy cóc. Đơn vị cha chỉ được cấp trong phạm vi số dư an toàn hiện có và không bao giờ xảy ra tình trạng âm quỹ.
        </Paragraph>
      ),
    },
    {
      key: '2',
      label: <Text strong>Ai là người có quyền duyệt chi tiêu của nhân viên?</Text>,
      children: (
        <Paragraph type="secondary">
          Hệ thống tuân thủ nghiêm ngặt nguyên tắc Quản lý trực tiếp: Nhân viên nộp chi tiêu thì Quản lý đơn vị duyệt. Mọi khoản chi từ chối đều bắt buộc ghi rõ lý do và lưu vết kiểm toán vĩnh viễn.
        </Paragraph>
      ),
    },
    {
      key: '3',
      label: <Text strong>Tại sao NoteVault lưu trữ tiền tệ bằng BigInt VND?</Text>,
      children: (
        <Paragraph type="secondary">
          Khác với các ứng dụng dùng số thực Float dễ bị sai số dấu phẩy động, NoteVault lưu trữ toàn bộ giá trị giao dịch bằng số nguyên BigInt chuẩn VND, đảm bảo đối soát kế toán chính xác 100%.
        </Paragraph>
      ),
    },
    {
      key: '4',
      label: <Text strong>Dữ liệu các công ty có bị lẫn lộn không?</Text>,
      children: (
        <Paragraph type="secondary">
          NoteVault xây dựng trên kiến trúc Multi-Tenant phân lập dữ liệu cấp cơ sở dữ liệu. Mỗi công ty sở hữu một mã định danh độc lập, danh mục chi tiêu riêng và cây đơn vị riêng biệt.
        </Paragraph>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <header
        style={{
          height: 64,
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: token.colorBgContainer,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        }}
      >
        <Flex align="center" gap="small">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <Text strong style={{ fontSize: 18 }}>
            NoteVault
          </Text>
        </Flex>

        <Space size="middle">
          <Link href="/docs" target="_blank">
            <Button type="text" icon={<FileTextOutlined />}>
              Tài liệu & API
            </Button>
          </Link>
          <ThemeToggle />
          <Link href={loginHref}>
            <Button>Đăng nhập</Button>
          </Link>
          <Link href={registerHref}>
            <Button type="primary">Đăng ký doanh nghiệp</Button>
          </Link>
        </Space>
      </header>

      {/* Hero Section */}
      <div style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <Tag color="blue" style={{ padding: '4px 12px', fontSize: 13, marginBottom: 20 }}>
          <SafetyCertificateOutlined /> Hệ thống Quản trị Ngân sách & Hóa đơn Doanh nghiệp
        </Tag>
        <Title level={1} style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.2, marginBottom: 20 }}>
          Kiểm soát ngân sách đa phân tầng, đối soát hóa đơn tự động bằng AI.
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>
          NoteVault loại bỏ hoàn toàn sự chậm trễ trong quy trình hoàn ứng tài chính. Bảo đảm 100% không bao giờ âm quỹ, phân quyền chặt chẽ theo cây tổ chức doanh nghiệp.
        </Paragraph>
        <Space size="middle">
          <Link href={registerHref}>
            <Button type="primary" size="large" icon={<ArrowRightOutlined />}>
              Bắt đầu miễn phí
            </Button>
          </Link>
          <Link href={loginHref}>
            <Button size="large">Đăng nhập không gian làm việc</Button>
          </Link>
        </Space>
      </div>

      {/* Interactive Demo Unit Tree */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 60px 24px', width: '100%' }}>
        <Card
          title={
            <Flex justify="space-between" align="center" wrap="wrap" gap="small">
              <Space>
                <ApartmentOutlined style={{ color: '#1e3a8a' }} />
                <Text strong>Mô hình Phân Cấp Ngân Sách Tự Động (Interactive Demo)</Text>
              </Space>
              <Segmented
                value={selectedDemoUnit}
                onChange={(val) => setSelectedDemoUnit(val as any)}
                options={[
                  { label: 'Cấp 1: Gốc (ROOT)', value: 'root' },
                  { label: 'Cấp 2: Khối KD', value: 'kd' },
                  { label: 'Cấp 3: Nhóm Sales', value: 'sales' },
                ]}
              />
            </Flex>
          }
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Flex vertical gap="small">
                <Text strong style={{ fontSize: 18 }}>{currentDemo.name}</Text>
                <Space>
                  <Tag color="purple">{currentDemo.roleBadge}</Tag>
                  <Tag color="cyan">{currentDemo.level}</Tag>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                  {currentDemo.description}
                </Paragraph>
                <div style={{ padding: '8px 12px', background: 'rgba(30, 58, 138, 0.05)', borderRadius: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Hoạt động gần nhất:</Text>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{currentDemo.recentActivity}</div>
                </div>
              </Flex>
            </Col>
            <Col xs={24} md={12}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>Tổng nhận vào</Text>
                    <div className="tabular-nums" style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', marginTop: 4 }}>
                      {formatVND(currentDemo.totalIn)}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>Đã cấp / Đã chi</Text>
                    <div className="tabular-nums" style={{ fontSize: 18, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
                      {formatVND(currentDemo.totalOut)}
                    </div>
                  </Card>
                </Col>
                <Col span={24}>
                  <Card size="small" style={{ background: 'rgba(5, 150, 105, 0.04)', borderColor: '#a7f3d0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Số dư an toàn (Safe Balance)</Text>
                    <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                      {formatVND(currentDemo.safeBalance)}
                    </div>
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Features Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 60px 24px', width: '100%' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
          Tính Năng Cốt Lõi Được Doanh Nghiệp Tin Dùng
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ height: '100%' }}>
              <ApartmentOutlined style={{ fontSize: 28, color: '#1e3a8a', marginBottom: 16 }} />
              <Title level={4}>Cây Đơn Vị Phân Tầng</Title>
              <Paragraph type="secondary" style={{ fontSize: 13 }}>
                Phân nhánh theo cơ cấu thực tế: Ban giám đốc, Khối phòng ban, Chi nhánh, Nhóm dự án.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ height: '100%' }}>
              <ScanOutlined style={{ fontSize: 28, color: '#059669', marginBottom: 16 }} />
              <Title level={4}>AI OCR Bóc Tách Hóa Đơn</Title>
              <Paragraph type="secondary" style={{ fontSize: 13 }}>
                Tự động nhận diện tổng tiền, mã số thuế, tên đơn vị bán từ ảnh chụp hóa đơn trong tích tắc.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ height: '100%' }}>
              <DollarOutlined style={{ fontSize: 28, color: '#d97706', marginBottom: 16 }} />
              <Title level={4}>Chuẩn Số Tiền BigInt VND</Title>
              <Paragraph type="secondary" style={{ fontSize: 13 }}>
                Lưu trữ tiền tệ bằng số nguyên chính xác tuyệt đối, triệt tiêu lỗi làm tròn dấu phẩy động.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ height: '100%' }}>
              <LockOutlined style={{ fontSize: 28, color: '#4f46e5', marginBottom: 16 }} />
              <Title level={4}>Bảo Mật Multi-Tenant</Title>
              <Paragraph type="secondary" style={{ fontSize: 13 }}>
                Cách ly dữ liệu 100% giữa các công ty, mã hóa đường truyền và nhật ký kiểm toán bất biến.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>

      {/* FAQ Section */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 80px 24px', width: '100%' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          Câu Hỏi Thường Gặp
        </Title>
        <Collapse items={faqs} defaultActiveKey={['1']} />
      </div>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid rgba(140, 140, 140, 0.2)',
          padding: '24px 32px',
          textAlign: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          © 2026 NoteVault Technologies Inc. Nền tảng quản trị tài chính doanh nghiệp an toàn.
        </Text>
      </footer>
    </div>
  );
};
