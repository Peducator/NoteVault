export type ScanStatus = 'PENDING_SCAN' | 'CLEAN' | 'INFECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Expense {
  id: string;
  user: string;
  purpose: string;
  category: 'Ăn uống' | 'Đi lại' | 'Mua sắm' | 'Phần mềm';
  date: string;
  amount: number;
  scanStatus: ScanStatus;
  approvalStatus: ApprovalStatus;
  taxCode?: string;
  vendorName?: string;
  receiptUrl?: string;
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
  employeeCode: string;
  department: string;
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
  role: 'ADMIN' | 'USER';
  tenantId: number | null;
  createdAt: string;
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
}

export interface AdminContextData {
  tenant: TenantInfo;
  admin: AdminInfo;
  employees: EmployeeUser[];
  joinRequests: JoinRequest[];
  departmentsOverview: DepartmentOverviewItem[];
}
