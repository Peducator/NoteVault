'use client';

import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Coins,
  RotateCcw,
  UserPlus,
  Trash2,
  Shield,
  Layers,
  ArrowRight,
  GitFork,
  CheckCircle2,
} from 'lucide-react';
import { formatVND } from '../../lib/format';
import { Unit } from '../../types/expense';

export interface HierarchicalUnit extends Unit {
  depth?: number;
}

interface UnitTreeTabProps {
  units: HierarchicalUnit[];
  onOpenCreateModal: (parentUnit: Unit | null) => void;
  onOpenAllocateModal: (sourceUnit: Unit | null) => void;
  onOpenRecallModal: (sourceUnit: Unit) => void;
  onOpenAddMemberModal: (unit: Unit) => void;
  onDeleteUnit: (unitId: number) => void;
  currentUserRole?: string;
}

export const UnitTreeTab: React.FC<UnitTreeTabProps> = ({
  units,
  onOpenCreateModal,
  onOpenAllocateModal,
  onOpenRecallModal,
  onOpenAddMemberModal,
  onDeleteUnit,
  currentUserRole,
}) => {
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  const toggleCollapse = (id: number) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isRoot = currentUserRole === 'ROOT';

  return (
    <div className="space-y-4">
      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-500" />
            Cơ cấu Cây Đơn Vị & Ngân Sách Phân Tầng
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Cấp Cha đóng vai trò két điều phối ngân sách • Nút Lá là nơi chi tiêu thực tế
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRoot && (
            <button
              onClick={() => onOpenAllocateModal(null)}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Nạp vốn ROOT</span>
            </button>
          )}
          <button
            onClick={() => onOpenCreateModal(null)}
            className="h-9 px-3.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo đơn vị mới</span>
          </button>
        </div>
      </div>

      {/* Tree list */}
      {units.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Building2 className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Chưa có cơ cấu đơn vị</p>
          <p className="text-xs text-zinc-400 mt-1">Bấm nút "Tạo đơn vị mới" để khởi tạo phòng ban đầu tiên</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {units.map((unit) => {
            const depth = unit.depth || 0;
            const hasChildren = (unit.children && unit.children.length > 0);
            const isCollapsed = collapsedMap[unit.id];
            const safeBalance = Number(unit.safeBalance) || 0;
            const isLeaf = !hasChildren;

            return (
              <div
                key={unit.id}
                className="p-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{ paddingLeft: `${Math.max(16, depth * 28 + 16)}px` }}
              >
                {/* Left: Hierarchy info */}
                <div className="flex items-start gap-3 min-w-0">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleCollapse(unit.id)}
                      className="mt-0.5 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors shrink-0"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-6 h-6 mt-0.5 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {unit.name}
                      </span>
                      {depth === 0 ? (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800/50">
                          Đơn vị Gốc
                        </span>
                      ) : isLeaf ? (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                          Nhóm Lá (Chi tiêu)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/50">
                          Két Trung Gian
                        </span>
                      )}

                      {unit.allowCreateSubUnit && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded">
                          Nest On
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                      <span>
                        Chủ quản: <strong className="text-zinc-700 dark:text-zinc-300 font-medium">{unit.owner?.name || unit.owner?.email || 'Chưa gán'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Thành viên: <strong className="text-zinc-700 dark:text-zinc-300 font-medium">{unit.members?.length || 0}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Balance & Actions */}
                <div className="flex items-center gap-3 self-end md:self-center shrink-0 flex-wrap">
                  {/* Safe Balance Badge */}
                  <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-right">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block leading-none mb-0.5 font-medium">
                      Số Dư An Toàn
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {formatVND(safeBalance)}
                    </span>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Cấp tiền */}
                    <button
                      onClick={() => onOpenAllocateModal(unit)}
                      title="Rót ngân sách từ đơn vị này"
                      className="h-8 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">Cấp tiền</span>
                    </button>

                    {/* Thu hồi (chỉ khi có parent và có tiền) */}
                    {unit.parentId && safeBalance > 0 && (
                      <button
                        onClick={() => onOpenRecallModal(unit)}
                        title="Thu hồi ngân sách về cấp trên"
                        className="h-8 px-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors border border-amber-200 dark:border-amber-800/40"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="hidden sm:inline">Thu hồi</span>
                      </button>
                    )}

                    {/* Thêm nhánh con */}
                    <button
                      onClick={() => onOpenCreateModal(unit)}
                      title="Tạo đơn vị con dưới đơn vị này"
                      className="h-8 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Thêm con</span>
                    </button>

                    {/* Thêm thành viên */}
                    <button
                      onClick={() => onOpenAddMemberModal(unit)}
                      title="Thêm thành viên vào đơn vị này"
                      className="h-8 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="hidden sm:inline">Thành viên</span>
                    </button>

                    {/* Xóa nếu là lá và không có chi tiêu */}
                    {isLeaf && isRoot && (
                      <button
                        onClick={() => onDeleteUnit(unit.id)}
                        title="Xóa đơn vị trống"
                        className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
