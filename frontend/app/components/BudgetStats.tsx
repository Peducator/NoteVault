'use client';

import React from 'react';
import { PieChart, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatVND } from '../lib/format';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {/* Card 1: Hạn mức phòng ban */}
      <div className="nv-card p-4 sm:p-5">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div>
            <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Hạn mức {departmentName} (Tháng 10)
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {formatVND(allowance)}
            </h2>
          </div>
          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-md border border-zinc-100 dark:border-zinc-700">
            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 dark:text-zinc-300" />
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-zinc-900 dark:text-zinc-200">Đã chi: {formatVND(usedAmount)}</span>
            <span className="text-zinc-500 dark:text-zinc-400">Còn lại: {formatVND(remainingAmount)}</span>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                usedPercentage > 80 ? 'bg-red-500' : 'bg-zinc-900 dark:bg-emerald-500'
              }`} 
              style={{ width: `${usedPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card 2: Đang chờ duyệt hoàn ứng */}
      <div className="nv-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Đang chờ duyệt hoàn ứng</p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {formatVND(pendingReimbursement)}
            </h2>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-100 dark:border-amber-900/50">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1 mt-3 sm:mt-4">
          <AlertCircle className="w-3.5 h-3.5" /> Các hóa đơn đang chờ Kế toán xử lý
        </p>
      </div>

      {/* Card 3: Đã thanh toán (Tháng này) */}
      <div className="nv-card p-4 sm:p-5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Đã thanh toán (Tháng này)</p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatVND(approvedReimbursed)}
            </h2>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-100 dark:border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-3 sm:mt-4">
          Đã chuyển khoản vào tài khoản cá nhân
        </p>
      </div>
    </div>
  );
};
