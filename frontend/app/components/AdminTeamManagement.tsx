'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Button, Badge, App, Flex } from 'antd';
import {
  ApartmentOutlined,
  SendOutlined,
  DollarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
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
  const { message } = App.useApp();
  const [activeSubTab, setActiveSubTab] = useState<string>('units');

  // Data states
  const [units, setUnits] = useState<HierarchicalUnit[]>([]);
  const [, setRawTree] = useState<Unit[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [requests, setRequests] = useState<AllocationRequestItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Fetch all team & budget data
  const loadData = async () => {
    try {
      setIsLoading(true);

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

      if (unitRes.status === 'fulfilled' && unitRes.value.success) {
        const data = unitRes.value.data as any;
        const treeData: Unit[] = Array.isArray(data) ? data : data.tree || [];
        setRawTree(treeData);
        setUnits(flattenUnitTree(treeData));
      }

      if (allocRes.status === 'fulfilled' && allocRes.value.success) {
        const aData = allocRes.value.data as any;
        const list = Array.isArray(aData) ? aData : aData?.items || aData?.allocations || [];
        setAllocations(list);
      }

      if (reqRes.status === 'fulfilled' && reqRes.value.success) {
        const rData = reqRes.value.data as any;
        const reqList = Array.isArray(rData) ? rData : rData?.requests || [];
        setRequests(reqList);
      }

      if (empRes.status === 'fulfilled' && empRes.value.success) {
        setEmployees(empRes.value.data || []);
      }

      if (joinRes.status === 'fulfilled' && joinRes.value.success) {
        setJoinRequests(joinRes.value.data || []);
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi tải dữ liệu phòng ban');
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
    try {
      const res = await unitApi.deleteUnit(unitId);
      if (res.success) {
        message.success(res.message || 'Đã xóa đơn vị thành công');
        loadData();
        onRefreshStats?.();
      } else {
        message.error(res.message || 'Không thể xóa đơn vị');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa đơn vị');
    }
  };

  const handleRemoveMember = async (unitId: number, userId: number) => {
    try {
      const res = await unitApi.removeMember(unitId, userId);
      if (res.success) {
        message.success('Đã gỡ nhân viên khỏi đơn vị');
        loadData();
      } else {
        message.error(res.message || 'Không thể gỡ nhân viên');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi gỡ nhân viên');
    }
  };

  const handleApproveJoin = async (requestId: string, role: 'MEMBER' | 'ROOT', unitId?: number) => {
    try {
      const res = await userApi.approveJoinRequest(requestId, role, unitId);
      if (res.success) {
        message.success('Đã duyệt đơn đăng ký nhân viên thành công');
        loadData();
      } else {
        message.error(res.message || 'Không thể duyệt đơn');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi duyệt đơn');
    }
  };

  const handleRejectJoin = async (requestId: string) => {
    try {
      const res = await userApi.rejectJoinRequest(requestId);
      if (res.success) {
        message.success('Đã từ chối đơn xin gia nhập');
        loadData();
      } else {
        message.error(res.message || 'Không thể từ chối đơn');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi từ chối đơn');
    }
  };

  const tabItems = [
    {
      key: 'units',
      label: (
        <span>
          <ApartmentOutlined /> Cây Đơn Vị & Ngân Sách
        </span>
      ),
      children: (
        <UnitTreeTab
          units={units}
          isLoading={isLoading}
          onOpenCreateModal={handleOpenCreateUnit}
          onOpenAllocateModal={handleOpenAllocate}
          onOpenRecallModal={handleOpenRecall}
          onOpenAddMemberModal={handleOpenAddMember}
          onDeleteUnit={handleDeleteUnit}
          currentUserRole={currentUser?.role}
        />
      ),
    },
    {
      key: 'requests',
      label: (
        <Badge count={pendingRequestsCount} size="small" offset={[8, 0]}>
          <span>
            <SendOutlined /> Yêu Cầu Cấp Ngân Sách
          </span>
        </Badge>
      ),
      children: (
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
          onToast={(msg, isErr) => (isErr ? message.error(msg) : message.success(msg))}
        />
      ),
    },
    {
      key: 'allocations',
      label: (
        <span>
          <DollarOutlined /> Sổ Cái Cấp Phát
        </span>
      ),
      children: (
        <DirectAllocationsTab
          allocations={allocations}
          units={units}
          onOpenAllocateModal={() => handleOpenAllocate(null)}
          onOpenRecallModal={handleOpenRecall}
        />
      ),
    },
    {
      key: 'employees',
      label: (
        <span>
          <TeamOutlined /> Nhân Sự ({employees.length})
        </span>
      ),
      children: (
        <EmployeesTab
          employees={employees}
          units={units}
          onOpenAddMemberModal={handleOpenAddMember}
          onRemoveMember={handleRemoveMember}
          currentUserRole={currentUser?.role}
        />
      ),
    },
    {
      key: 'joinRequests',
      label: (
        <Badge count={pendingJoinCount} size="small" offset={[8, 0]}>
          <span>
            <ClockCircleOutlined /> Đơn Gia Nhập
          </span>
        </Badge>
      ),
      children: (
        <JoinRequestsTab
          joinRequests={joinRequests}
          units={units}
          onApprove={handleApproveJoin}
          onReject={handleRejectJoin}
        />
      ),
    },
  ];

  return (
    <Flex vertical gap="middle">
      <Tabs
        activeKey={activeSubTab}
        onChange={(key) => setActiveSubTab(key)}
        items={tabItems}
        size="large"
        tabBarExtraContent={
          <Button
            icon={<ReloadOutlined spin={isLoading} />}
            onClick={loadData}
            loading={isLoading}
            aria-label="Làm mới"
          >
            <span className="tab-refresh-text">Làm mới</span>
          </Button>
        }
      />

      <style jsx global>{`
        @media (max-width: 576px) {
          .tab-refresh-text {
            display: none !important;
          }
        }
      `}</style>

      {/* Modals */}
      <RecallModal
        isOpen={isRecallModalOpen}
        onClose={() => {
          setIsRecallModalOpen(false);
          setUnitForRecall(null);
        }}
        onSuccess={(msg) => {
          message.success(msg);
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
          message.success(msg);
          loadData();
          onRefreshStats?.();
        }}
        request={requestForFund}
      />

      <CreateRequestModal
        isOpen={isCreateRequestModalOpen}
        onClose={() => setIsCreateRequestModalOpen(false)}
        onSuccess={(msg) => {
          message.success(msg);
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
          message.success(msg);
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
          message.success(msg);
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
          message.success(msg);
          loadData();
        }}
        unit={unitForAddMember}
        employees={employees}
      />
    </Flex>
  );
};
