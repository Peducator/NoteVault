'use client';

import React from 'react';
import { Card, Row, Col, Progress, Typography, Flex, theme } from 'antd';
import { formatVND } from '../lib/format';
import { useTheme } from '../context/ThemeContext';

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
  const { token } = theme.useToken();
  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const usedPercentage = allowance > 0 ? Math.min(100, Math.round((usedAmount / allowance) * 100)) : 0;
  const remainingAmount = Math.max(0, allowance - usedAmount);

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{
        marginBottom: 24,
        overflow: 'hidden',
        border: `1px solid ${token.colorBorder}`,
        borderRadius: 10,
      }}
    >
      <Row>
        {/* Metric 1: Hạn Mức & Đã Chi */}
        <Col
          xs={24}
          md={8}
          style={{
            padding: '20px 24px',
            borderRight: `1px solid ${token.colorBorder}`,
            borderBottom: `1px solid ${token.colorBorder}`,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(30, 58, 138, 0.04)',
          }}
        >
          <Flex vertical gap={4}>
            <Flex justify="space-between" align="center">
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em' }}>
                HẠN MỨC {departmentName.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: usedPercentage > 85 ? token.colorError : token.colorPrimary }}>
                {usedPercentage}% ĐÃ CHI
              </Text>
            </Flex>

            <div style={{ fontSize: 26, fontWeight: 800, color: token.colorText, margin: '4px 0' }} className="tabular-nums">
              {formatVND(allowance)}
            </div>

            <Progress
              percent={usedPercentage}
              showInfo={false}
              size={['100%', 5]}
              strokeColor={usedPercentage > 85 ? token.colorError : token.colorPrimary}
              trailColor={token.colorFillSecondary}
            />

            <Flex justify="space-between" style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Đã sử dụng: <strong style={{ color: token.colorText }}>{formatVND(usedAmount)}</strong>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Khả dụng: <strong style={{ color: token.colorSuccess }}>{formatVND(remainingAmount)}</strong>
              </Text>
            </Flex>
          </Flex>
        </Col>

        {/* Metric 2: Đang Chờ Duyệt (Pending) */}
        <Col
          xs={24}
          md={8}
          style={{
            padding: '20px 24px',
            borderRight: `1px solid ${token.colorBorder}`,
            borderBottom: `1px solid ${token.colorBorder}`,
            backgroundColor: isDark ? 'rgba(217, 119, 6, 0.10)' : 'rgba(217, 119, 6, 0.05)',
          }}
        >
          <Flex vertical gap={4}>
            <Flex align="center" gap={8}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: token.colorWarning }} />
              <Text style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: token.colorWarning }}>
                CHỜ DUYỆT HOÀN ỨNG
              </Text>
            </Flex>

            <div style={{ fontSize: 26, fontWeight: 800, color: token.colorWarning, margin: '4px 0' }} className="tabular-nums">
              {formatVND(pendingReimbursement)}
            </div>

            <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              Hóa đơn đang trong quy trình đối soát thẩm quyền cấp quản lý
            </Text>
          </Flex>
        </Col>

        {/* Metric 3: Đã Thanh Toán Hoàn Ứng (Paid) */}
        <Col
          xs={24}
          md={8}
          style={{
            padding: '20px 24px',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.10)' : 'rgba(5, 150, 105, 0.05)',
          }}
        >
          <Flex vertical gap={4}>
            <Flex align="center" gap={8}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: token.colorSuccess }} />
              <Text style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: token.colorSuccess }}>
                ĐÃ QUYẾT TOÁN THÁNG NÀY
              </Text>
            </Flex>

            <div style={{ fontSize: 26, fontWeight: 800, color: token.colorSuccess, margin: '4px 0' }} className="tabular-nums">
              {formatVND(approvedReimbursed)}
            </div>

            <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              Đã hoàn tiền thực tế vào tài khoản ngân hàng của nhân viên
            </Text>
          </Flex>
        </Col>
      </Row>
    </Card>
  );
};
