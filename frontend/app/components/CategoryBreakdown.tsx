'use client';

import React from 'react';
import { Card, Progress, Alert, Typography, Flex, Empty, theme } from 'antd';
import { formatVND } from '../lib/format';

const { Title, Text } = Typography;

interface CategoryItem {
  id?: string;
  name?: string;
  label?: string;
  spent?: number;
  amount?: number;
  allocated?: number;
  percent?: number;
  color?: string;
}

interface CategoryBreakdownProps {
  categories?: CategoryItem[];
  departmentName?: string;
  usagePercent?: number;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories = [],
  departmentName = 'Phòng ban',
  usagePercent = 0,
}) => {
  const { token } = theme.useToken();
  const totalSpent = categories.reduce((sum, c) => sum + (c.spent ?? c.amount ?? 0), 0) || 1;

  return (
    <Flex vertical gap="middle">
      <Card
        title={<Title level={5} style={{ margin: 0, fontSize: 14 }}>Phân Bổ Chi Phí Theo Danh Mục</Title>}
        style={{ border: `1px solid ${token.colorBorder}` }}
      >
        {categories.length === 0 ? (
          <Empty description="Chưa có dữ liệu chi tiêu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Flex vertical gap="middle">
            {categories.map((item, idx) => {
              const name = item.name || item.label || 'Khác';
              const spent = item.spent ?? item.amount ?? 0;
              const percent = item.percent ?? Math.min(100, Math.round((spent / totalSpent) * 100));

              return (
                <div key={idx}>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{name}</Text>
                    <Text strong style={{ fontSize: 13 }} className="tabular-nums">
                      {formatVND(spent)}
                    </Text>
                  </Flex>
                  <Progress percent={percent} size="small" strokeColor={token.colorPrimary} railColor={token.colorFillSecondary} />
                </div>
              );
            })}
          </Flex>
        )}
      </Card>

      <Alert
        title={<Text strong style={{ fontSize: 13 }}>Giám sát trần ngân sách</Text>}
        description={
          <span style={{ fontSize: 12 }}>
            {departmentName} đã chi <strong>{usagePercent}%</strong> hạn mức kỳ này.{' '}
            {usagePercent >= 80
              ? 'Cần phê duyệt thận trọng để không thấu chi nguồn vốn phân tầng.'
              : 'Dòng tiền đang được kiểm soát trong ngưỡng an toàn tuyệt đối.'}
          </span>
        }
        type={usagePercent >= 80 ? 'error' : 'info'}
        showIcon
        style={{ border: `1px solid ${token.colorBorder}` }}
      />
    </Flex>
  );
};
