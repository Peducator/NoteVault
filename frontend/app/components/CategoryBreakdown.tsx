'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatVND } from '../lib/format';

interface CategoryItem {
  label: string;
  amount: number;
  percent: number;
  color: string;
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
  return (
    <div className="space-y-6">
      {/* Breakdown Card */}
      <div className="nv-card p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">Phân bổ theo danh mục</h3>
        <div className="space-y-4">
          {categories.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3 text-center">Chưa có dữ liệu chi tiêu</p>
          ) : (
            categories.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{formatVND(item.amount)}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.color} transition-all duration-300`} 
                    style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Card Cảnh báo hạn mức */}
      <div className={`border rounded-xl p-4 flex gap-3 shadow-sm transition-colors ${
        usagePercent >= 80 
          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200' 
          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
      }`}>
        <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          usagePercent >= 80 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
        }`} />
        <div>
          <h4 className="text-sm font-semibold">Tình trạng hạn mức ngân sách</h4>
          <p className="text-xs mt-1 leading-relaxed opacity-90">
            {departmentName} đã sử dụng <strong>{usagePercent}%</strong> ngân sách tháng. {usagePercent >= 80 ? 'Vui lòng kiểm soát các khoản chi để tránh vượt trần ngân sách.' : 'Các khoản chi đang trong giới hạn cho phép.'}
          </p>
        </div>
      </div>
    </div>
  );
};
