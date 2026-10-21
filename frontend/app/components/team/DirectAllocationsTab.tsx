'use client';

import React from 'react';
import { Coins, ArrowRight, RotateCcw, Plus, Wallet, Clock, User } from 'lucide-react';
import { formatVND } from '../../lib/format';
import { Allocation, Unit } from '../../types/expense';

interface DirectAllocationsTabProps {
  allocations: Allocation[];
  units: Unit[];
  onOpenAllocateModal: () => void;
  onOpenRecallModal: (unit: Unit) => void;
}

export const DirectAllocationsTab: React.FC<DirectAllocationsTabProps> = ({
  allocations,
  units,
  onOpenAllocateModal,
  onOpenRecallModal,
}) => {
  const unitMap = new Map(units.map((u) => [u.id, u]));

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Sổ Cái Cấp Phát & Thu Hồi Ngân Sách Trực Tiếp
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Sổ cái bất biến (Append-only ledger) ghi nhận mọi dòng tiền lưu chuyển giữa các đơn vị
          </p>
        </div>
        <button
          onClick={onOpenAllocateModal}
          className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Cấp ngân sách</span>
        </button>
      </div>

      {/* Allocations Table */}
      {allocations.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Wallet className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Chưa có giao dịch cấp phát nào</p>
          <p className="text-xs text-zinc-400 mt-1">Các giao dịch rót vốn hoặc thu hồi ngân sách sẽ xuất hiện tại đây</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400 divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Mã GD</th>
                  <th className="py-3.5 px-4">Dòng tiền (Nguồn ➔ Đích)</th>
                  <th className="py-3.5 px-4 text-right">Số tiền (VND)</th>
                  <th className="py-3.5 px-4">Người thực hiện</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
                {allocations.map((alloc) => {
                  const allocAmount = Number(alloc.amount) || 0;
                  const isRootFunding = !alloc.sourceUnitId;
                  const targetUnit = unitMap.get(alloc.targetUnitId);
                  const canRecall = targetUnit && targetUnit.parentId && (Number(targetUnit.safeBalance) || 0) > 0;

                  return (
                    <tr key={alloc.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        #{alloc.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isRootFunding ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {alloc.sourceUnit?.name || 'Vốn ban đầu ROOT'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {alloc.targetUnit?.name || `Đơn vị #${alloc.targetUnitId}`}
                          </span>
                        </div>
                        {alloc.note && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-xs">{alloc.note}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{formatVND(allocAmount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{alloc.createdBy?.name || alloc.createdBy?.email || 'Quản trị viên'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-400 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{new Date(alloc.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canRecall && targetUnit && (
                          <button
                            onClick={() => onOpenRecallModal(targetUnit)}
                            title="Thu hồi ngân sách từ đơn vị này"
                            className="h-7 px-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-semibold transition-colors border border-amber-200 dark:border-amber-800/40 inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Thu hồi</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
