'use client';

import React from 'react';
import { Row, Col, Card, Statistic, Progress, Typography, Flex } from 'antd';
import {
  PieChartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { formatVND } from '../lib/format';

const { Text } = Typography;

interface BudgetStatsProps {
  departmentName?: string;
  allowance: number;
  usedAmount: number;
  pendingReimbursement: number;
  approvedReimbursed: number;
}

export const BudgetStats: React.FC<BudgetStatsProps> = ({
  departmentName = 'Phòng Marketing',
  allowance,
  usedAmount,
  pendingReimbursement,
  approvedReimbursed,
}) => {
  const usedPercentage = Math.min(100, Math.round((usedAmount / allowance) * 100));
  const remainingAmount = Math.max(0, allowance - usedAmount);

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* Card 1: Hạn mức phòng ban */}
      <Col xs={24} sm={12} lg={8}>
        <Card bordered hoverable style={{ height: '100%' }}>
          <Flex justify="space-between" align="flex-start">
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Hạn mức {departmentName}
              </Text>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 12px 0' }}>
                {formatVND(allowance)}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                fontSize: 18,
              }}
            >
              <PieChartOutlined />
            </div>
          </Flex>

          <Progress
            percent={usedPercentage}
            status={usedPercentage > 85 ? 'exception' : 'active'}
            strokeColor={usedPercentage > 85 ? '#ef4444' : '#2563eb'}
            size={['100%', 8]}
          />
          <Flex justify="space-between" style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đã chi: <strong>{formatVND(usedAmount)}</strong>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Còn lại: <strong>{formatVND(remainingAmount)}</strong>
            </Text>
          </Flex>
        </Card>
      </Col>

      {/* Card 2: Đang chờ duyệt hoàn ứng */}
      <Col xs={24} sm={12} lg={8}>
        <Card bordered hoverable style={{ height: '100%' }}>
          <Flex justify="space-between" align="flex-start">
            <Statistic
              title={<Text type="secondary">Đang chờ duyệt hoàn ứng</Text>}
              value={formatVND(pendingReimbursement)}
              valueStyle={{ fontWeight: 700, fontSize: 24 }}
            />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(217, 119, 6, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                fontSize: 18,
              }}
            >
              <ClockCircleOutlined />
            </div>
          </Flex>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 16, display: 'block' }}>
            Các hóa đơn đang chờ quản lý và kế toán xác nhận
          </Text>
        </Card>
      </Col>

      {/* Card 3: Đã thanh toán */}
      <Col xs={24} sm={24} lg={8}>
        <Card bordered hoverable style={{ height: '100%' }}>
          <Flex justify="space-between" align="flex-start">
            <Statistic
              title={<Text type="secondary">Đã thanh toán (Tháng này)</Text>}
              value={formatVND(approvedReimbursed)}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: '#16a34a' }}
            />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(22, 163, 74, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                fontSize: 18,
              }}
            >
              <CheckCircleOutlined />
            </div>
          </Flex>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 16, display: 'block' }}>
            Đã chuyển khoản trực tiếp vào tài khoản nhân viên
          </Text>
        </Card>
      </Col>
    </Row>
  );
};
