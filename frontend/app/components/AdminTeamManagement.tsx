'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus,
  UserCheck, 
  UserX, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Trash2, 
  ChevronDown, 
  ShieldCheck, 
  RefreshCw,
  Filter,
  Plus
} from 'lucide-react';
import { formatCurrency } from '../lib/format';
import { JoinRequest, EmployeeUser, DepartmentOverviewItem } from '../types/expense';
import { userApi } from '../apis/userApi';

interface AdminTeamManagementProps {
  onRefreshStats?: () => void;
}

export const AdminTeamManagement: React.FC<AdminTeamManagementProps> = ({
  onRefreshStats,
}) => {
  const [subTab, setSubTab] = useState<'employees' | 'requests' | 'departments'>('employees');
  
  // Data state
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [departmentsOverview, setDepartmentsOverview] = useState<DepartmentOverviewItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  
  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Approve Dialog State
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [approveRole, setApproveRole] = useState<'USER' | 'ADMIN'>('USER');
  const [approveDept, setApproveDept] = useState('Marketing');
  const [isApproving, setIsApproving] = useState(false);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDept, setNewDept] = useState('Marketing');
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN'>('USER');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const [resReq, resDept, resEmp] = await Promise.all([
        userApi.getJoinRequests(),
        userApi.getDepartmentsOverview(),
        userApi.getUsers(),
      ]);

      setJoinRequests(resReq.data || []);
      setDepartmentsOverview(resDept.data || []);
      setEmployees(resEmp.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải dữ liệu quản lý người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // 1. Thêm người dùng mới trực tiếp (Admin only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setErrorMsg(null);

    try {
      await userApi.createUser({
        email: newEmail.trim(),
        password: newPassword,
        name: newName.trim(),
        role: newRole,
        department: newDept,
      });

      showToast(`Đã thêm thành công người dùng ${newName} (${newEmail})!`);
      setIsCreateModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('USER');
      await loadData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo người dùng mới');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // 2. Phê duyệt đơn gia nhập từ Redis
  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsApproving(true);
    setErrorMsg(null);

    try {
      await userApi.approveJoinRequest(selectedRequest.requestId, {
        role: approveRole,
        department: approveDept,
      });

      showToast(`Đã phê duyệt thành công người dùng ${selectedRequest.name} (${selectedRequest.email})!`);
      setSelectedRequest(null);
      await loadData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi phê duyệt yêu cầu');
    } finally {
      setIsApproving(false);
    }
  };

  // 3. Từ chối đơn gia nhập (Xóa sạch Redis, 0 byte DB rác)
  const handleReject = async (requestId: string, employeeName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn TỪ CHỐI đơn của ${employeeName}? Dữ liệu sẽ được xóa sạch khỏi bộ nhớ tạm.`)) {
      return;
    }

    setErrorMsg(null);

    try {
      await userApi.rejectJoinRequest(requestId);
      showToast(`Đã từ chối và xóa sạch yêu cầu của ${employeeName}. Không lưu rác vào Database.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi từ chối yêu cầu');
    }
  };

  // 4. Xóa mềm (khóa) người dùng
  const handleDeleteEmployee = async (employeeId: number, employeeName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn vô hiệu hóa tài khoản của ${employeeName}?`)) {
      return;
    }

    setErrorMsg(null);

    try {
      await userApi.deleteUser(employeeId);
      showToast(`Đã vô hiệu hóa tài khoản ${employeeName} (Xóa mềm).`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi khóa người dùng');
    }
  };

  // Bộ lọc danh sách người dùng
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = (
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.employeeCode && emp.employeeCode.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q))
      );

      const matchDept = deptFilter === 'ALL' || (emp.department || 'Marketing') === deptFilter;
      const matchRole = roleFilter === 'ALL' || emp.role === roleFilter;

      return matchSearch && matchDept && matchRole;
    });
  }, [employees, searchQuery, deptFilter, roleFilter]);

  // Thống kê vai trò
  const adminCount = employees.filter(e => e.role === 'ADMIN').length;
  const userCount = employees.filter(e => e.role === 'USER').length;

  return (
    <div className="space-y-6">
      {/* Toast thông báo thành công */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Thông báo lỗi */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Thẻ Thống kê Tóm tắt (4 KPI Cards chuẩn FinTech) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Tổng số Users */}
        <div 
          onClick={() => setSubTab('employees')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            subTab === 'employees' 
              ? 'bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-900 dark:border-zinc-700 shadow-md' 
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${subTab === 'employees' ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
              Tổng số Users
            </span>
            <Users className={`w-4 h-4 ${subTab === 'employees' ? 'text-zinc-300' : 'text-zinc-400'}`} />
          </div>
          <p className="text-2xl font-bold tracking-tight">{employees.length}</p>
          <p className={`text-[11px] mt-1 ${subTab === 'employees' ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
            Tài khoản chính thức
          </p>
        </div>

        {/* Quản trị viên */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Quản trị viên</span>
            <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">
              {adminCount}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{adminCount}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Toàn quyền hệ thống</p>
        </div>

        {/* Nhân viên */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nhân viên</span>
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
              {userCount}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{userCount}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Thành viên nộp hóa đơn</p>
        </div>

        {/* Đơn chờ duyệt (Redis 3 ngày) */}
        <div 
          onClick={() => setSubTab('requests')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            subTab === 'requests' 
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-1 ring-amber-300 dark:ring-amber-800' 
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Đơn chờ duyệt</span>
            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-[10px]">
              {joinRequests.length}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{joinRequests.length}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Redis tạm (3 ngày)
          </p>
        </div>
      </div>

      {/* Tabs Navigation & Nút Tạo mới */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSubTab('employees')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subTab === 'employees'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Danh sách Users ({employees.length})</span>
          </button>

          <button
            onClick={() => setSubTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subTab === 'requests'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Đơn chờ duyệt</span>
            {joinRequests.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] rounded-full font-bold">
                {joinRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('departments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subTab === 'departments'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Phòng ban & Ngân sách ({departmentsOverview.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="nv-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm User mới</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================
          SUB-TAB 1: DANH SÁCH USERS CHÍNH THỨC
         ======================================================== */}
      {subTab === 'employees' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          {/* Header Bảng kèm Thanh tìm kiếm & Bộ lọc */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Quản lý người dùng doanh nghiệp</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Danh sách các tài khoản có quyền truy cập hệ thống.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, mã NV..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-500"
                />
              </div>

              {/* Lọc phòng ban */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden text-zinc-700 dark:text-zinc-200"
              >
                <option value="ALL">Tất cả phòng ban</option>
                <option value="Marketing">Marketing</option>
                <option value="Kỹ thuật">Kỹ thuật</option>
                <option value="Kinh doanh">Kinh doanh</option>
                <option value="Nhân sự">Nhân sự</option>
                <option value="Tài chính">Tài chính</option>
              </select>

              {/* Lọc quyền hạn */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden text-zinc-700 dark:text-zinc-200"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên (Admin)</option>
                <option value="USER">Nhân viên (User)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Người dùng</th>
                  <th className="py-3 px-4">Mã số NV</th>
                  <th className="py-3 px-4">Phòng ban</th>
                  <th className="py-3 px-4">Quyền hạn</th>
                  <th className="py-3 px-4">Ngày tham gia</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-400 dark:text-zinc-500">
                      Không tìm thấy người dùng nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 text-xs flex-shrink-0">
                            {emp.name ? emp.name.charAt(0).toUpperCase() : emp.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">{emp.name || 'Chưa đặt tên'}</div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {emp.employeeCode ? (
                          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700">
                            {emp.employeeCode}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 italic">Tự cấp khi login</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-700 dark:text-zinc-300">
                        {emp.department || 'Marketing'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          emp.role === 'ADMIN' 
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                        }`}>
                          {emp.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                        {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id, emp.name || emp.email)}
                          className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors cursor-pointer"
                          title="Vô hiệu hóa tài khoản (Xóa mềm)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: ĐƠN GIA NHẬP CHỜ DUYỆT (REDIS 3 NGÀY)
         ======================================================== */}
      {subTab === 'requests' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Danh sách đơn xin gia nhập chờ duyệt</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Lưu tạm trên Redis trong 3 ngày. Sau khi duyệt, người dùng sẽ có thể đăng nhập ngay.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              {joinRequests.length} đơn đang chờ
            </span>
          </div>

          {joinRequests.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Không có đơn xin gia nhập nào đang chờ duyệt</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Các ứng viên gửi yêu cầu từ ngoài trang chủ sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nhân sự</th>
                    <th className="py-3 px-4">Mã số NV tự cấp</th>
                    <th className="py-3 px-4">Phòng ban</th>
                    <th className="py-3 px-4">Thời gian gửi</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {joinRequests.map((req) => (
                    <tr key={req.requestId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">{req.name}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{req.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                          {req.employeeCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-700 dark:text-zinc-300">{req.department}</td>
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'Vừa xong'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3" /> Chờ duyệt (Redis 3 ngày)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(req);
                            setApproveDept(req.department || 'Marketing');
                            setApproveRole('USER');
                          }}
                          className="px-2.5 py-1 bg-zinc-900 dark:bg-emerald-600 hover:bg-zinc-800 dark:hover:bg-emerald-500 text-white font-medium rounded-md text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Phê duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req.requestId, req.name)}
                          className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-900/60 font-medium rounded-md text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: PHÒNG BAN & PHÂN BỔ NGÂN SÁCH
         ======================================================== */}
      {subTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departmentsOverview.map((dept) => (
              <div 
                key={dept.departmentName}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{dept.departmentName}</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{dept.memberCount} thành viên</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">Ngân sách định mức</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(dept.allowance)}
                    </span>
                  </div>
                </div>

                {/* Danh sách thành viên trong phòng ban */}
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    Thành viên trực thuộc
                  </p>
                  {dept.members.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Chưa có nhân viên nào trong phòng ban này</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {dept.members.map((m) => (
                        <div 
                          key={m.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-50/80 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{m.name || 'Chưa đặt tên'}</span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-1.5">({m.email})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {m.employeeCode && (
                              <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 px-1.5 py-0.2 rounded">
                                {m.employeeCode}
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              m.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {m.role === 'ADMIN' ? 'Admin' : 'Nhân viên'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: THÊM USER MỚI TRỰC TIẾP
         ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-zinc-900 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Thêm người dùng mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="nv-label">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Lê Thị Kế Toán"
                  className="nv-input"
                />
              </div>

              <div>
                <label className="nv-label">Email công việc *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ketoan@vinfast.vn"
                  className="nv-input"
                />
              </div>

              <div>
                <label className="nv-label">Mật khẩu khởi tạo *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="nv-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nv-label">Phòng ban *</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="nv-input bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="Marketing">Marketing</option>
                    <option value="Kỹ thuật">Kỹ thuật</option>
                    <option value="Kinh doanh">Kinh doanh</option>
                    <option value="Nhân sự">Nhân sự</option>
                    <option value="Tài chính">Tài chính</option>
                  </select>
                </div>

                <div>
                  <label className="nv-label">Quyền hạn *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'USER' | 'ADMIN')}
                    className="nv-input bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="USER">Nhân viên (User)</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="nv-btn-secondary px-4 py-2 text-xs"
                  disabled={isCreatingUser}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="nv-btn-primary px-4 py-2 text-xs"
                >
                  {isCreatingUser ? 'Đang tạo...' : 'Tạo người dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: XÁC NHẬN PHÊ DUYỆT ĐƠN GIA NHẬP
         ======================================================== */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Phê duyệt thành viên</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/70 rounded-xl p-3 text-xs space-y-1.5 border border-zinc-200/60 dark:border-zinc-700">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Họ và tên:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{selectedRequest.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Email:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{selectedRequest.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Mã số NV tự cấp:</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-emerald-400">{selectedRequest.employeeCode}</span>
              </div>
            </div>

            {/* Cấp Role */}
            <div>
              <label className="nv-label">Cấp quyền (Role) *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setApproveRole('USER')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                    approveRole === 'USER'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750'
                  }`}
                >
                  Nhân viên (User)
                </button>
                <button
                  type="button"
                  onClick={() => setApproveRole('ADMIN')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                    approveRole === 'ADMIN'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750'
                  }`}
                >
                  Quản trị viên (Admin)
                </button>
              </div>
            </div>

            {/* Chọn phòng ban chính thức */}
            <div>
              <label className="nv-label">Phòng ban phân bổ *</label>
              <div className="relative">
                <select
                  value={approveDept}
                  onChange={(e) => setApproveDept(e.target.value)}
                  className="nv-input appearance-none pr-8 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  <option value="Marketing">Marketing</option>
                  <option value="Kỹ thuật">Kỹ thuật</option>
                  <option value="Kinh doanh">Kinh doanh</option>
                  <option value="Nhân sự">Nhân sự</option>
                  <option value="Tài chính">Tài chính</option>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="nv-btn-secondary px-4 py-2 text-xs"
                disabled={isApproving}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving}
                className="nv-btn-primary px-4 py-2 text-xs"
              >
                {isApproving ? 'Đang phê duyệt...' : 'Xác nhận phê duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
