'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Send,
  Coins,
  Users,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Unit, Allocation, EmployeeUser, JoinRequest } from '../types/expense';
import { unitApi } from '../apis/unitApi';
import { allocationApi } from '../apis/allocationApi';
import { allocationRequestApi, AllocationRequestItem } from '../apis/allocationRequestApi';
import { userApi } from '../apis/userApi';

// Sub-components
import { UnitTreeTab, HierarchicalUnit } from './team/UnitTreeTab';
import { AllocationRequestsTab } from './team/AllocationRequestsTab';
import { DirectAllocationsTab } from './team/DirectAllocationsTab';
import { EmployeesTab } from './team/EmployeesTab';
import { JoinRequestsTab } from './team/JoinRequestsTab';

// Modals
import { RecallModal } from './team/modals/RecallModal';
import { FundRequestModal } from './team/modals/FundRequestModal';
import { CreateRequestModal } from './team/modals/CreateRequestModal';
import { CreateUnitModal } from './team/modals/CreateUnitModal';
import { AllocateModal } from './team/modals/AllocateModal';
import { AddMemberModal } from './team/modals/AddMemberModal';

interface AdminTeamManagementProps {
  onRefreshStats?: () => void;
}

function flattenUnitTree(nodes: Unit[], depth = 0): HierarchicalUnit[] {
  const result: HierarchicalUnit[] = [];
  for (const n of nodes) {
    result.push({ ...n, depth });
    if (n.children && n.children.length > 0) {
      result.push(...flattenUnitTree(n.children, depth + 1));
    }
  }
  return result;
}

export const AdminTeamManagement: React.FC<AdminTeamManagementProps> = ({
  onRefreshStats,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'units' | 'requests' | 'allocations' | 'employees' | 'joinRequests'>('units');

  // Data states
  const [units, setUnits] = useState<HierarchicalUnit[]>([]);
  const [rawTree, setRawTree] = useState<Unit[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [requests, setRequests] = useState<AllocationRequestItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Modals state
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [unitForRecall, setUnitForRecall] = useState<Unit | null>(null);

  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [requestForFund, setRequestForFund] = useState<AllocationRequestItem | null>(null);

  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);

  const [isCreateUnitModalOpen, setIsCreateUnitModalOpen] = useState(false);
  const [parentUnitForNewChild, setParentUnitForNewChild] = useState<Unit | null>(null);

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [sourceUnitForAllocation, setSourceUnitForAllocation] = useState<Unit | null>(null);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [unitForAddMember, setUnitForAddMember] = useState<Unit | null>(null);

  // Show Toast Helper
  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch all team & budget data
  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load user profile from storage
      const storedUser = localStorage.getItem('nv_user');
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {}
      }

      const [unitRes, allocRes, reqRes, empRes, joinRes] = await Promise.allSettled([
        unitApi.getUnitTree(),
        allocationApi.getAllocations(),
        allocationRequestApi.getRequests(),
        userApi.getEmployees(),
        userApi.getJoinRequests(),
      ]);

      // Units
      if (unitRes.status === 'fulfilled' && unitRes.value.success) {
        const data = unitRes.value.data as any;
        const treeData: Unit[] = Array.isArray(data) ? data : data.tree || [];
        setRawTree(treeData);
        setUnits(flattenUnitTree(treeData));
      }

      // Allocations
      if (allocRes.status === 'fulfilled' && allocRes.value.success) {
        setAllocations(allocRes.value.data || []);
      }

      // Requests
      if (reqRes.status === 'fulfilled' && reqRes.value.success) {
        const rData = reqRes.value.data as any;
        const reqList = Array.isArray(rData) ? rData : rData?.requests || [];
        setRequests(reqList);
      }

      // Employees
      if (empRes.status === 'fulfilled' && empRes.value.success) {
        setEmployees(empRes.value.data || []);
      }

      // Join requests
      if (joinRes.status === 'fulfilled' && joinRes.value.success) {
        setJoinRequests(joinRes.value.data || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải dữ liệu phòng ban', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'PENDING' || r.status === 'ALLOCATING').length;
  }, [requests]);

  const pendingJoinCount = useMemo(() => {
    return joinRequests.length;
  }, [joinRequests]);

  // Handlers for Unit Actions
  const handleOpenCreateUnit = (parent: Unit | null) => {
    setParentUnitForNewChild(parent);
    setIsCreateUnitModalOpen(true);
  };

  const handleOpenAllocate = (source: Unit | null) => {
    setSourceUnitForAllocation(source);
    setIsAllocateModalOpen(true);
  };

  const handleOpenRecall = (source: Unit) => {
    setUnitForRecall(source);
    setIsRecallModalOpen(true);
  };

  const handleOpenAddMember = (unit: Unit) => {
    setUnitForAddMember(unit);
    setIsAddMemberModalOpen(true);
  };

  const handleDeleteUnit = async (unitId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn vị trống này không?')) return;
    try {
      const res = await unitApi.deleteUnit(unitId);
      if (res.success) {
        showToast(res.message || 'Đã xóa đơn vị thành công');
        loadData();
        onRefreshStats?.();
      } else {
        showToast(res.message || 'Không thể xóa đơn vị', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa đơn vị', true);
    }
  };

  const handleRemoveMember = async (unitId: number, userId: number) => {
    if (!confirm('Bạn có chắc chắn muốn gỡ nhân viên này khỏi đơn vị không?')) return;
    try {
      const res = await unitApi.removeMember(unitId, userId);
      if (res.success) {
        showToast('Đã gỡ nhân viên khỏi đơn vị');
        loadData();
      } else {
        showToast(res.message || 'Không thể gỡ nhân viên', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi gỡ nhân viên', true);
    }
  };

  const handleApproveJoin = async (requestId: string, role: 'MEMBER' | 'ROOT', unitId?: number) => {
    try {
      const res = await userApi.approveJoinRequest(requestId, role, unitId);
      if (res.success) {
        showToast('Đã duyệt đơn đăng ký nhân viên thành công');
        loadData();
      } else {
        showToast(res.message || 'Không thể duyệt đơn', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi duyệt đơn', true);
    }
  };

  const handleRejectJoin = async (requestId: string) => {
    if (!confirm('Bạn có chắc chắn muốn từ chối đơn đăng ký này?')) return;
    try {
      const res = await userApi.rejectJoinRequest(requestId);
      if (res.success) {
        showToast('Đã từ chối đơn xin gia nhập');
        loadData();
      } else {
        showToast(res.message || 'Không thể từ chối đơn', true);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi từ chối đơn', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-md transition-all ${
            toastMessage.isError
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2">
          {/* Tab 1: Units Tree */}
          <button
            onClick={() => setActiveSubTab('units')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSubTab === 'units'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cây Đơn Vị & Ngân Sách</span>
          </button>

          {/* Tab 2: Allocation Requests */}
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSubTab === 'requests'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Yêu Cầu Cấp Ngân Sách</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          {/* Tab 3: Direct Allocations */}
          <button
            onClick={() => setActiveSubTab('allocations')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSubTab === 'allocations'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Sổ Cái Cấp Phát</span>
          </button>

          {/* Tab 4: Employees */}
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSubTab === 'employees'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nhân Sự ({employees.length})</span>
          </button>

          {/* Tab 5: Join Requests */}
          <button
            onClick={() => setActiveSubTab('joinRequests')}
            className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSubTab === 'joinRequests'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Đơn Gia Nhập</span>
            {pendingJoinCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                {pendingJoinCount}
              </span>
            )}
          </button>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadData}
          disabled={isLoading}
          title="Tải lại toàn bộ dữ liệu"
          className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* Sub-Tab Contents */}
      {activeSubTab === 'units' && (
        <UnitTreeTab
          units={units}
          onOpenCreateModal={handleOpenCreateUnit}
          onOpenAllocateModal={handleOpenAllocate}
          onOpenRecallModal={handleOpenRecall}
          onOpenAddMemberModal={handleOpenAddMember}
          onDeleteUnit={handleDeleteUnit}
          currentUserRole={currentUser?.role}
        />
      )}

      {activeSubTab === 'requests' && (
        <AllocationRequestsTab
          requests={requests}
          units={units}
          currentUserId={currentUser?.id}
          onRefresh={loadData}
          onOpenCreateRequestModal={() => setIsCreateRequestModalOpen(true)}
          onOpenFundModal={(req) => {
            setRequestForFund(req);
            setIsFundModalOpen(true);
          }}
          onToast={showToast}
        />
      )}

      {activeSubTab === 'allocations' && (
        <DirectAllocationsTab
          allocations={allocations}
          units={units}
          onOpenAllocateModal={() => handleOpenAllocate(null)}
          onOpenRecallModal={handleOpenRecall}
        />
      )}

      {activeSubTab === 'employees' && (
        <EmployeesTab
          employees={employees}
          units={units}
          onOpenAddMemberModal={handleOpenAddMember}
          onRemoveMember={handleRemoveMember}
          currentUserRole={currentUser?.role}
        />
      )}

      {activeSubTab === 'joinRequests' && (
        <JoinRequestsTab
          joinRequests={joinRequests}
          units={units}
          onApprove={handleApproveJoin}
          onReject={handleRejectJoin}
        />
      )}

      {/* Modals */}
      <RecallModal
        isOpen={isRecallModalOpen}
        onClose={() => {
          setIsRecallModalOpen(false);
          setUnitForRecall(null);
        }}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
          onRefreshStats?.();
        }}
        sourceUnit={unitForRecall}
        targetParentUnit={units.find((u) => u.id === unitForRecall?.parentId)}
      />

      <FundRequestModal
        isOpen={isFundModalOpen}
        onClose={() => {
          setIsFundModalOpen(false);
          setRequestForFund(null);
        }}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
          onRefreshStats?.();
        }}
        request={requestForFund}
      />

      <CreateRequestModal
        isOpen={isCreateRequestModalOpen}
        onClose={() => setIsCreateRequestModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
        units={units}
      />

      <CreateUnitModal
        isOpen={isCreateUnitModalOpen}
        onClose={() => {
          setIsCreateUnitModalOpen(false);
          setParentUnitForNewChild(null);
        }}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
          onRefreshStats?.();
        }}
        parentUnit={parentUnitForNewChild}
        employees={employees}
      />

      <AllocateModal
        isOpen={isAllocateModalOpen}
        onClose={() => {
          setIsAllocateModalOpen(false);
          setSourceUnitForAllocation(null);
        }}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
          onRefreshStats?.();
        }}
        sourceUnit={sourceUnitForAllocation}
        targetUnits={units}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setUnitForAddMember(null);
        }}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
        unit={unitForAddMember}
        employees={employees}
      />
    </div>
  );
};
