'use client';

import React from 'react';
import { Card, Progress, Alert, Typography, Flex, Empty } from 'antd';
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
  const totalSpent = categories.reduce((sum, c) => sum + (c.spent ?? c.amount ?? 0), 0) || 1;

  return (
    <Flex vertical gap="middle">
      <Card bordered title={<Title level={5} style={{ margin: 0 }}>Phân bổ theo danh mục</Title>}>
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
                    <Text strong style={{ fontSize: 13 }}>{name}</Text>
                    <Text strong style={{ fontSize: 13 }}>{formatVND(spent)}</Text>
                  </Flex>
                  <Progress percent={percent} size="small" strokeColor="#2563eb" />
                </div>
              );
            })}
          </Flex>
        )}
      </Card>

      <Alert
        message={<Text strong>Tình trạng hạn mức ngân sách</Text>}
        description={
          <span style={{ fontSize: 12 }}>
            {departmentName} đã sử dụng <strong>{usagePercent}%</strong> ngân sách tháng.{' '}
            {usagePercent >= 80
              ? 'Vui lòng kiểm soát các khoản chi để tránh vượt trần ngân sách.'
              : 'Các khoản chi đang nằm trong giới hạn an toàn.'}
          </span>
        }
        type={usagePercent >= 80 ? 'error' : 'warning'}
        showIcon
      />
    </Flex>
  );
};
