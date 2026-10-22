export type ScanStatus = 'PENDING_SCAN' | 'CLEAN' | 'INFECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'PAID';
export type UserRole = 'ROOT' | 'MEMBER' | 'ADMIN';
export type UnitMemberRole = 'EDIT' | 'VIEWER';

export interface UnitMember {
  id: number;
  uuid?: string;
  name: string | null;
  email: string;
  role: UserRole;
  unitMemberRole?: UnitMemberRole;
  unitId?: number | null;
  isOwner?: boolean;
}

export interface Unit {
  id: number;
  name: string;
  parentId: number | null;
  ownerId: number | null;
  tenantId: number;
  allowCreateSubUnit?: boolean;
  allowMemberViewBalance?: boolean;
  createdAt?: string;
  parent?: {
    id: number;
    name: string;
  } | null;
  children?: Unit[];
  owner?: {
    id: number;
    name: string | null;
    email: string;
    role: UserRole;
  } | null;
  members?: UnitMember[];
  isLeaf?: boolean;
  totalIn?: string | number;
  totalOut?: string | number;
  totalSpent?: string | number;
  safeBalance?: string | number;
}

export interface Allocation {
  id: number;
  amount: string | number;
  type?: 'ALLOCATE' | 'RECALL' | string;
  sourceUnitId: number | null;
  targetUnitId: number;
  tenantId: number;
  note?: string | null;
  reason?: string | null;
  createdAt: string;
  sourceUnit?: {
    id: number;
    name: string;
  } | null;
  targetUnit?: {
    id: number;
    name: string;
  };
  createdBy?: {
    id: number;
    name: string | null;
    email: string;
  };
}

export interface Expense {
  id: string;
  user: string;
  purpose: string;
  category: string;
  date: string;
  amount: number;
  scanStatus: ScanStatus;
  approvalStatus: ApprovalStatus;
  taxCode?: string;
  vendorName?: string;
  receiptUrl?: string;
  unitId?: number;
  unitName?: string;
  rejectionReason?: string | null;
  userId?: number;
}

export interface DepartmentBudget {
  departmentName: string;
  allowance: number;
  usedAmount: number;
  pendingReimbursement: number;
  approvedReimbursed: number;
}

export interface JoinRequest {
  requestId: string;
  email: string;
  name: string;
  employeeCode?: string;
  department?: string;
  unitId?: number;
  tenantId: number;
  createdAt: string;
}

export interface EmployeeUser {
  id: number;
  uuid?: string;
  email: string;
  name: string | null;
  employeeCode?: string | null;
  department?: string | null;
  unitId?: number | null;
  unit?: {
    id: number;
    name: string;
  } | null;
  role: UserRole | string;
  unitMemberRole?: UnitMemberRole;
  tenantId: number | null;
  createdAt: string;
  isOwner?: boolean;
}

export interface DepartmentOverviewItem {
  departmentName: string;
  allowance: number;
  memberCount: number;
  members: EmployeeUser[];
}

export interface TenantInfo {
  companyName: string;
  code: string;
  uuid: string;
  createdAt: string;
  totalEmployees: number;
}

export interface AdminInfo {
  name: string | null;
  email: string;
  role: string;
  uuid: string;
  employeeCode?: string | null;
  department?: string | null;
  unitId?: number | null;
}

export interface AdminContextData {
  tenant: TenantInfo;
  admin: AdminInfo;
  employees: EmployeeUser[];
  joinRequests: JoinRequest[];
  departmentsOverview: DepartmentOverviewItem[];
  units?: Unit[];
}
