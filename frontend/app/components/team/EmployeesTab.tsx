'use client';

import React, { useState } from 'react';
import { Users, Search, Filter, ShieldCheck, Shield, Trash2, UserPlus, Building2 } from 'lucide-react';
import { EmployeeUser, Unit } from '../../types/expense';

interface EmployeesTabProps {
  employees: EmployeeUser[];
  units: Unit[];
  onOpenAddMemberModal: (unit: Unit) => void;
  onRemoveMember: (unitId: number, userId: number) => void;
  currentUserRole?: string;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  units,
  onOpenAddMemberModal,
  onRemoveMember,
  currentUserRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const unitMap = new Map(units.map((u) => [u.id, u]));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUnit =
      unitFilter === 'ALL' ||
      (unitFilter === 'UNASSIGNED' ? !emp.unitId : emp.unitId?.toString() === unitFilter);

    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

    return matchesSearch && matchesUnit && matchesRole;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email nhân viên..."
            className="w-full h-10 pl-9 pr-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="h-10 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
          >
            <option value="ALL">Mọi đơn vị</option>
            <option value="UNASSIGNED">Chưa phân nhóm (Tự do)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id.toString()}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
          >
            <option value="ALL">Mọi vai trò</option>
            <option value="ROOT">ROOT (Giám đốc)</option>
            <option value="MEMBER">MEMBER (Nhân viên)</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      {filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Không tìm thấy nhân viên phù hợp</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400 divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Nhân viên</th>
                  <th className="py-3.5 px-4">Đơn vị trực thuộc</th>
                  <th className="py-3.5 px-4">Quyền công ty</th>
                  <th className="py-3.5 px-4">Vai trò đơn vị</th>
                  <th className="py-3.5 px-4">Ngày gia nhập</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
                {filteredEmployees.map((emp) => {
                  const assignedUnit = emp.unitId ? unitMap.get(emp.unitId) : null;
                  const isUnitOwner = assignedUnit && assignedUnit.ownerId === emp.id;

                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {emp.name || 'Chưa đặt tên'}
                        </div>
                        <div className="text-[11px] text-zinc-400">{emp.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        {assignedUnit ? (
                          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{assignedUnit.name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Chưa phân nhóm</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {emp.role === 'ROOT' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/50">
                            ROOT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                            MEMBER
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isUnitOwner ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800/50">
                            Trưởng nhóm (Owner)
                          </span>
                        ) : emp.unitMemberRole === 'EDIT' ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800/50">
                            Đồng quản lý (EDIT)
                          </span>
                        ) : assignedUnit ? (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded">
                            Thành viên (VIEWER)
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px] whitespace-nowrap">
                        {new Date(emp.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {assignedUnit && !isUnitOwner && (
                            <button
                              onClick={() => onRemoveMember(assignedUnit.id, emp.id)}
                              title="Gỡ khỏi đơn vị"
                              className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
