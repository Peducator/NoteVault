'use client';

import React, { useState } from 'react';
import { ShieldCheck, Clock, ShieldAlert, MoreHorizontal, Search } from 'lucide-react';
import { Expense } from '../types/expense';
import { formatVND } from '../lib/format';

interface ExpenseTableProps {
  expenses: Expense[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onViewAll?: () => void;
}

type OrderStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  searchQuery,
  onSearchChange,
}) => {
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [internalQuery, setInternalQuery] = useState('');

  const activeQuery = searchQuery !== undefined ? searchQuery : internalQuery;
  const handleQueryChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalQuery(val);
    }
  };

  // Đếm số lượng theo trạng thái
  const pendingCount = expenses.filter((e) => e.approvalStatus === 'PENDING').length;
  const approvedCount = expenses.filter((e) => e.approvalStatus === 'APPROVED').length;
  const rejectedCount = expenses.filter((e) => e.approvalStatus === 'REJECTED').length;

  // Lọc kết hợp giữa Trạng thái đơn và Từ khóa tìm kiếm
  const filteredExpenses = expenses.filter((exp) => {
    const matchStatus = statusFilter === 'ALL' || exp.approvalStatus === statusFilter;
    const query = activeQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      exp.user.toLowerCase().includes(query) ||
      exp.purpose.toLowerCase().includes(query) ||
      exp.id.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query);

    return matchStatus && matchQuery;
  });

  return (
    <div className="nv-card flex flex-col">
      {/* Header bảng + Tìm kiếm + Bộ lọc trạng thái đơn */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Hóa đơn chi tiêu gần đây</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Quản lý và theo dõi tiến độ duyệt hoàn ứng</p>
          </div>

          {/* Ô tìm kiếm giao dịch */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Tìm mã GD, người chi..."
              value={activeQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-zinc-400 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Cụm bộ lọc trạng thái đơn */}
        <div className="flex items-center gap-2 w-full overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800/80 text-xs flex-nowrap whitespace-nowrap">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({expenses.length})
            </button>
            <button 
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'PENDING' 
                  ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-400 shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Chờ duyệt ({pendingCount})
            </button>
            <button 
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'APPROVED' 
                  ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Đã duyệt ({approvedCount})
            </button>
            <button 
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'REJECTED' 
                  ? 'bg-white dark:bg-zinc-700 text-red-700 dark:text-red-400 shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Từ chối ({rejectedCount})
            </button>
          </div>
        </div>
      </div>
      
      {/* 1. Mobile Card View */}
      <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredExpenses.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-400">
            <p className="font-medium text-zinc-600 dark:text-zinc-300 mb-1 text-sm">Không tìm thấy đơn chi tiêu nào</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div key={exp.id} className="p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
              <div className="flex items-start justify-between gap-2.5 mb-1.5">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug">{exp.purpose}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{exp.id}</span>
                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{exp.category}</span>
                    {exp.taxCode && (
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        MST: {exp.taxCode}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-zinc-900 dark:text-white text-sm block">
                    {formatVND(exp.amount)}
                  </span>
                  <div className="mt-1">
                    {exp.approvalStatus === 'APPROVED' && (
                      <span className="nv-badge-success text-[10px] py-0.5 px-1.5">Đã duyệt</span>
                    )}
                    {exp.approvalStatus === 'PENDING' && (
                      <span className="nv-badge-warning text-[10px] py-0.5 px-1.5">Chờ duyệt</span>
                    )}
                    {exp.approvalStatus === 'REJECTED' && (
                      <span className="nv-badge-danger text-[10px] py-0.5 px-1.5">Từ chối</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 mt-2">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">{exp.user}</span>
                <span className="font-mono text-[11px]">{exp.date}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 2. Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[640px]">
          <thead className="bg-zinc-50/50 dark:bg-zinc-800/40 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-5 py-3">Mã GD / Mục đích</th>
              <th className="px-5 py-3">Người nộp</th>
              <th className="px-5 py-3">Ngày</th>
              <th className="px-5 py-3 text-right">Số tiền</th>
              <th className="px-5 py-3 text-center">Bảo mật</th>
              <th className="px-5 py-3 text-center">Trạng thái đơn</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-zinc-400">
                  <p className="font-medium text-zinc-600 dark:text-zinc-300 mb-1">Không tìm thấy đơn chi tiêu nào</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {searchQuery ? `Không có hóa đơn nào khớp với từ khóa "${searchQuery}"` : 'Không có hóa đơn nào theo trạng thái đã chọn'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors group">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white">{exp.purpose}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{exp.id}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-medium">{exp.category}</span>
                      {exp.taxCode && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                          <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" title={exp.vendorName || 'Đã đối chiếu Cổng Đăng ký KD'}>
                            MST: {exp.taxCode}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Người nộp đơn */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center">
                        {exp.user.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{exp.user}</span>
                    </div>
                  </td>

                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 text-xs font-mono">{exp.date}</td>
                  
                  <td className="px-5 py-3 text-right font-semibold text-zinc-900 dark:text-white">
                    {formatVND(exp.amount)}
                  </td>
                  
                  {/* Trạng thái an toàn tệp */}
                  <td className="px-5 py-3 text-center">
                    <div className="flex justify-center">
                      {exp.scanStatus === 'CLEAN' && (
                        <span title="Tệp an toàn" className="text-emerald-500 inline-flex items-center gap-1 text-xs">
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                      )}
                      {exp.scanStatus === 'PENDING_SCAN' && (
                        <span title="Đang quét mã độc" className="text-amber-500 inline-flex items-center gap-1 text-xs">
                          <Clock className="w-4 h-4" />
                        </span>
                      )}
                      {exp.scanStatus === 'INFECTED' && (
                        <span title="Phát hiện mã độc (Đã chặn)" className="text-red-500 inline-flex items-center gap-1 text-xs">
                          <ShieldAlert className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Approval Status Badge */}
                  <td className="px-5 py-3 text-center">
                    {exp.approvalStatus === 'APPROVED' && (
                      <span className="nv-badge-success">Đã duyệt</span>
                    )}
                    {exp.approvalStatus === 'PENDING' && (
                      <span className="nv-badge-warning">Chờ duyệt</span>
                    )}
                    {exp.approvalStatus === 'REJECTED' && (
                      <span className="nv-badge-danger">Từ chối</span>
                    )}
                  </td>

                  <td className="px-5 py-3 text-right">
                    <button className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
